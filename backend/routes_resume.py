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


def keyword_overlap_score(resume_text: str, job_description: str):
    """Simple ATS-style overlap score for quick deterministic feedback."""
    stop = {
        "the", "and", "for", "with", "from", "that", "this", "are", "you", "your",
        "have", "has", "will", "our", "job", "role", "work", "team", "years", "year",
        "experience", "skills", "required", "preferred", "ability", "using", "within",
    }
    token_re = re.compile(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}")
    resume_tokens = {t.lower() for t in token_re.findall(resume_text) if t.lower() not in stop}
    job_tokens = {t.lower() for t in token_re.findall(job_description) if t.lower() not in stop}
    if not job_tokens:
        return 0, []

    overlap = sorted(job_tokens.intersection(resume_tokens))
    pct = int(round((len(overlap) / max(len(job_tokens), 1)) * 100))
    missing = sorted(list(job_tokens - resume_tokens))[:20]
    return min(pct, 100), missing


def extract_json_response(raw_text: str, fallback: dict):
    try:
        cleaned = (raw_text or "").strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned)
    except Exception:
        return fallback


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


@router.post("/job-match")
async def job_match(request: Request, user: dict = Depends(get_current_user)):
    """Analyze resume against a target job description and return fit + rewrite guidance."""
    data = await request.json()
    job_description = (data.get("job_description") or "").strip()
    resume_text = (data.get("resume_text") or "").strip()

    if not job_description:
        return JSONResponse({"detail": "job_description is required"}, status_code=400)

    if not resume_text:
        db = get_db()
        latest = await db.resumes.find_one({"user_id": user["id"]}, sort=[("created_at", -1)])
        if latest:
            resume_text = latest.get("resume_text") or ""
            if not resume_text:
                resume_text = (latest.get("result", {}).get("ai_analysis") or "")[:5000]

    if not resume_text:
        return JSONResponse({"detail": "No resume data found. Upload and analyze a resume first."}, status_code=400)

    overlap_score, missing_keywords = keyword_overlap_score(resume_text, job_description)

    prompt = f"""
You are a senior recruiting mentor and ATS expert.
Compare the candidate resume against the target job description.

Return valid JSON with exact keys:
- \"match_score\": integer (0-100)
- \"top_matches\": array of strings
- \"gaps\": array of strings
- \"priority_keywords\": array of strings
- \"rewrite_summary\": string (2-3 lines)
- \"bullet_rewrites\": array of 4 improved resume bullets aligned to job expectations

Resume:
{resume_text[:12000]}

Job Description:
{job_description[:9000]}
"""

    ai_payload = {
        "match_score": overlap_score,
        "top_matches": [],
        "gaps": ["Unable to parse AI response"],
        "priority_keywords": missing_keywords[:8],
        "rewrite_summary": "Use targeted keywords from the job description and quantify outcomes.",
        "bullet_rewrites": [],
    }

    try:
        response = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        ai_payload = extract_json_response(response.text or "", ai_payload)
    except Exception:
        pass

    # Blend deterministic overlap with AI output for stability.
    ai_payload["match_score"] = int(round((int(ai_payload.get("match_score", overlap_score)) + overlap_score) / 2))
    if not ai_payload.get("priority_keywords"):
        ai_payload["priority_keywords"] = missing_keywords[:8]

    return JSONResponse(ai_payload)


@router.post("/career-plan")
async def career_plan(request: Request, user: dict = Depends(get_current_user)):
    """Generate optional 30-day mentor plan with HR expectations."""
    data = await request.json()
    target_role = (data.get("target_role") or "").strip()
    resume_summary = (data.get("resume_summary") or "").strip()
    if not target_role:
        return JSONResponse({"detail": "target_role is required"}, status_code=400)

    if not resume_summary:
        db = get_db()
        latest = await db.resumes.find_one({"user_id": user["id"]}, sort=[("created_at", -1)])
        if latest:
            resume_summary = (latest.get("result", {}).get("ai_analysis") or latest.get("resume_text", ""))[:8000]

    prompt = f"""
You are a strict but supportive career mentor + HR interviewer.
Create a realistic 30-day plan for a candidate targeting: {target_role}.

Return valid JSON with exact keys:
- \"mentor_rules\": array of 6 short non-negotiable rules
- \"hr_expectations\": array of 6 short expectations recruiters have
- \"weekly_focus\": array of 4 objects with keys week, goal, deliverables (array)
- \"daily_micro_tasks\": array of 10 concise actions

Candidate context:
{resume_summary[:10000]}
"""

    fallback = {
        "mentor_rules": [
            "Use quantified impact in every major bullet.",
            "Keep claims verifiable with project proof.",
            "Prioritize role-specific keywords over generic buzzwords.",
            "One narrative per role: problem, action, measurable result.",
            "Fix grammar and formatting before adding content.",
            "Update resume after every meaningful project milestone.",
        ],
        "hr_expectations": [
            "Clear alignment between role requirements and your experience.",
            "Consistency across resume, LinkedIn, and interview story.",
            "Evidence of ownership, not only participation.",
            "Strong communication with concise, high-signal bullets.",
            "Technical depth for core tools listed.",
            "Recent learning momentum and adaptability.",
        ],
        "weekly_focus": [
            {"week": "Week 1", "goal": "Baseline and gap audit", "deliverables": ["Role keyword map", "Resume score baseline", "Top 5 skill gaps"]},
            {"week": "Week 2", "goal": "Evidence building", "deliverables": ["2 quantified project bullets", "1 portfolio case study"]},
            {"week": "Week 3", "goal": "Interview readiness", "deliverables": ["STAR stories for 5 scenarios", "Mock interview notes"]},
            {"week": "Week 4", "goal": "Polish and applications", "deliverables": ["Final resume version", "Targeted applications batch"]},
        ],
        "daily_micro_tasks": [
            "Rewrite one bullet with action + metric.",
            "Add one keyword from target JD naturally.",
            "Practice one HR answer using STAR.",
            "Review one project for measurable outcome.",
            "Trim low-value wording from summary.",
            "Update skills section priority order.",
            "Do one 15-minute mock interview prompt.",
            "Check resume ATS readability in plain text.",
            "Improve one project title for clarity.",
            "Capture one learning proof (cert/course/project).",
        ],
    }

    try:
        response = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        payload = extract_json_response(response.text or "", fallback)
        return JSONResponse(payload)
    except Exception:
        return JSONResponse(fallback)


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


@router.get("/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user)):
    """Return leaderboard using each user's best score."""
    db = get_db()

    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "best_score": {"$max": "$score"},
                "analyses": {"$sum": 1},
                "last_analyzed": {"$max": "$created_at"},
            }
        },
        {"$sort": {"best_score": -1, "analyses": -1, "last_analyzed": -1}},
    ]

    grouped = await db.resumes.aggregate(pipeline).to_list(length=500)
    if not grouped:
        return {"top": [], "current_user_rank": None}

    object_ids = []
    user_id_map = {}
    for row in grouped:
        uid = row.get("_id")
        try:
            oid = ObjectId(uid)
            object_ids.append(oid)
            user_id_map[str(oid)] = uid
        except Exception:
            continue

    users_by_id = {}
    if object_ids:
        cursor = db.users.find({"_id": {"$in": object_ids}}, {"name": 1, "email": 1})
        async for doc in cursor:
            users_by_id[str(doc["_id"])] = doc

    ranked = []
    for idx, row in enumerate(grouped, start=1):
        uid = row.get("_id")
        user_doc = users_by_id.get(uid, {})
        email = user_doc.get("email", "")
        fallback_name = email.split("@")[0].title() if email else "User"
        ranked.append(
            {
                "rank": idx,
                "user_id": uid,
                "name": user_doc.get("name") or fallback_name,
                "email": email,
                "best_score": int(row.get("best_score", 0)),
                "analyses": int(row.get("analyses", 0)),
            }
        )

    current = next((r for r in ranked if r["user_id"] == user["id"]), None)
    return {"top": ranked[:10], "current_user_rank": current}


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
