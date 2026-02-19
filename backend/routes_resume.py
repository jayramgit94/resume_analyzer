import re
import json
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import JSONResponse
from google import genai
from pypdf import PdfReader
from bson import ObjectId
from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter(tags=["resume"])

# Gemini client
_client = genai.Client(api_key=GEMINI_API_KEY)


# ----- helpers (unchanged from original) -----

def extract_text_from_pdf(file):
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def calculate_resume_score(text: str):
    score = 0
    skills = ["python", "java", "c++", "machine learning", "sql", "aws", "react"]
    skill_count = sum(1 for skill in skills if skill.lower() in text.lower())
    score += min(skill_count * 3, 20)

    numbers = re.findall(r"\d+%|\d+\+", text)
    score += min(len(numbers) * 4, 20)

    years = re.findall(r"\d+\s+years", text.lower())
    score += min(len(years) * 5, 20)

    verbs = ["developed", "built", "designed", "implemented", "optimized"]
    verb_count = sum(1 for v in verbs if v in text.lower())
    score += min(verb_count * 2, 10)

    word_count = len(text.split())
    if word_count > 300:
        score += 15
    elif word_count > 200:
        score += 10

    if "experience" in text.lower() and "education" in text.lower():
        score += 15

    return min(score, 100)


def analyze_with_gemini(text: str):
    prompt = f"""
You are a professional ATS resume evaluator.

Analyze the resume below and return your analysis as valid JSON with these exact keys:
- "strengths": array of strings listing resume strengths
- "weaknesses": array of strings listing resume weaknesses
- "missing_keywords": array of strings listing important missing keywords
- "suggestions": array of strings with improvement suggestions
- "hr_questions": array of 5 tailored interview questions for this candidate
- "tips": array of actionable do's and don'ts

Return ONLY the JSON object, no markdown code fences, no extra text.

Resume:
{text}
"""
    response = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    raw_text = response.text or ""

    try:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned)
    except (json.JSONDecodeError, Exception):
        return {"raw": raw_text}


# ----- API Endpoints -----

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Analyze a resume PDF. Requires auth. Saves result to history."""
    text = extract_text_from_pdf(file.file)
    algorithm_score = calculate_resume_score(text)
    gemini_result = analyze_with_gemini(text)

    result = {
        "algorithm_score": algorithm_score,
        "ai_analysis": gemini_result.get("raw", ""),
        "strengths": gemini_result.get("strengths", []),
        "weaknesses": gemini_result.get("weaknesses", []),
        "missing_keywords": gemini_result.get("missing_keywords", []),
        "suggestions": gemini_result.get("suggestions", []),
        "hr_questions": gemini_result.get("hr_questions", [
            "Tell me about yourself.",
            "What are your strengths and weaknesses?",
            "Describe a challenging project you worked on.",
            "Why do you want this job?",
            "Where do you see yourself in 5 years?"
        ]),
        "tips": gemini_result.get("tips", [
            "Use more quantified achievements.",
            "Highlight relevant technical and soft skills.",
            "Keep formatting clean and consistent.",
            "Tailor your resume to the job description.",
            "Proofread for grammar and spelling errors."
        ]),
    }

    # Save to history
    db = get_db()
    history_doc = {
        "user_id": user["id"],
        "filename": file.filename,
        "score": algorithm_score,
        "result": result,
        "resume_text": text[:20000],
        "created_at": datetime.now(timezone.utc),
    }
    inserted = await db.resumes.insert_one(history_doc)
    result["history_id"] = str(inserted.inserted_id)

    return JSONResponse(result)


@router.get("/history")
async def get_history(user: dict = Depends(get_current_user)):
    """Get all past resume analyses for the current user."""
    db = get_db()
    cursor = db.resumes.find(
        {"user_id": user["id"]},
        {"resume_text": 0},  # exclude large text from listing
    ).sort("created_at", -1)

    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "filename": doc.get("filename", ""),
            "score": doc.get("score", 0),
            "created_at": doc["created_at"].isoformat(),
        })
    return results


@router.get("/history/{history_id}")
async def get_history_detail(history_id: str, user: dict = Depends(get_current_user)):
    """Get a single past resume analysis."""
    db = get_db()
    doc = await db.resumes.find_one({
        "_id": ObjectId(history_id),
        "user_id": user["id"],
    })
    if not doc:
        return JSONResponse({"detail": "Not found"}, status_code=404)

    return {
        "id": str(doc["_id"]),
        "filename": doc.get("filename", ""),
        "score": doc.get("score", 0),
        "result": doc.get("result", {}),
        "created_at": doc["created_at"].isoformat(),
    }


@router.delete("/history/{history_id}")
async def delete_history(history_id: str, user: dict = Depends(get_current_user)):
    """Delete a past resume analysis."""
    db = get_db()
    result = await db.resumes.delete_one({
        "_id": ObjectId(history_id),
        "user_id": user["id"],
    })
    if result.deleted_count == 0:
        return JSONResponse({"detail": "Not found"}, status_code=404)
    return {"detail": "Deleted"}


@router.post("/generate-hr-questions")
async def generate_hr_questions(request: Request, user: dict = Depends(get_current_user)):
    """Generate custom interview questions from resume text."""
    data = await request.json()
    resume_text = data.get("resume_text", "")
    if not resume_text:
        return JSONResponse({"questions": []})

    prompt = f"""
You are an expert interviewer. Read this resume and generate 10 unique interview questions
(mix of technical and behavioral) with brief expected answers. Format as:
1. Question: ...
   Expected Answer: ...
Resume:
{resume_text}
"""
    response = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    qa_pairs = []
    if response and response.text:
        lines = response.text.splitlines()
        current_q, current_a = None, None
        for line in lines:
            q_match = re.match(r"\d+\.\s*Question:\s*(.+)", line)
            a_match = re.match(r"Expected Answer:\s*(.+)", line)
            if q_match:
                if current_q and current_a:
                    qa_pairs.append({"question": current_q, "expected_answer": current_a})
                current_q = q_match.group(1).strip()
                current_a = None
            elif a_match and current_q:
                current_a = a_match.group(1).strip()
        if current_q and current_a:
            qa_pairs.append({"question": current_q, "expected_answer": current_a})
    return JSONResponse({"questions": qa_pairs})
