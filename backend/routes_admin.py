"""Admin-only analytics endpoints. Read-only queries — no existing logic changed."""
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.auth import get_current_user
from backend.database import get_db
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAILS = {"admin@resume.com"}  # quick allowlist — extend as needed


async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    db = get_db()
    total_users = await db.users.count_documents({})
    total_resumes = await db.resumes.count_documents({})

    pipeline_scores = [
        {"$group": {
            "_id": None,
            "avg": {"$avg": "$score"},
            "max": {"$max": "$score"},
            "min": {"$min": "$score"},
        }}
    ]
    scores = await db.resumes.aggregate(pipeline_scores).to_list(1)
    s = scores[0] if scores else {}

    return {
        "total_users": total_users,
        "total_resumes": total_resumes,
        "avg_score": round(s.get("avg", 0), 1),
        "max_score": s.get("max", 0),
        "min_score": s.get("min", 0),
    }


@router.get("/users")
async def admin_users(user: dict = Depends(require_admin)):
    db = get_db()
    users = []
    async for u in db.users.find().sort("created_at", -1):
        resume_count = await db.resumes.count_documents({"user_id": str(u["_id"])})
        last_resume = await db.resumes.find_one(
            {"user_id": str(u["_id"])},
            sort=[("created_at", -1)],
        )
        users.append({
            "id": str(u["_id"]),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "resume_count": resume_count,
            "last_active": last_resume["created_at"].isoformat() if last_resume else u.get("created_at", datetime.now(timezone.utc)).isoformat(),
            "created_at": u.get("created_at", datetime.now(timezone.utc)).isoformat(),
        })
    return users


@router.get("/users/{user_id}/resumes")
async def admin_user_resumes(user_id: str, admin: dict = Depends(require_admin)):
    db = get_db()
    results = []
    async for doc in db.resumes.find({"user_id": user_id}).sort("created_at", -1):
        results.append({
            "id": str(doc["_id"]),
            "filename": doc.get("filename", ""),
            "score": doc.get("score", 0),
            "result": doc.get("result", {}),
            "created_at": doc["created_at"].isoformat(),
        })
    return results


@router.get("/top-resumes")
async def admin_top_resumes(limit: int = Query(5, le=20), user: dict = Depends(require_admin)):
    db = get_db()
    results = []
    async for doc in db.resumes.find().sort("score", -1).limit(limit):
        # look up user name
        uid = doc.get("user_id")
        u = await db.users.find_one({"_id": ObjectId(uid)}) if uid else None
        results.append({
            "id": str(doc["_id"]),
            "filename": doc.get("filename", ""),
            "score": doc.get("score", 0),
            "user_name": u["name"] if u else "Unknown",
            "created_at": doc["created_at"].isoformat(),
        })
    return results


@router.get("/activity")
async def admin_activity(days: int = Query(30, le=365), user: dict = Depends(require_admin)):
    """Resumes analyzed per day for the last N days."""
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1},
            "avg_score": {"$avg": "$score"},
        }},
        {"$sort": {"_id": 1}},
    ]
    data = await db.resumes.aggregate(pipeline).to_list(365)
    return [{"date": d["_id"], "count": d["count"], "avg_score": round(d["avg_score"], 1)} for d in data]


@router.get("/analytics")
async def admin_analytics(user: dict = Depends(require_admin)):
    """Aggregate weaknesses, missing keywords, strengths across all resumes."""
    db = get_db()

    weakness_freq = {}
    keyword_freq = {}
    strength_freq = {}

    async for doc in db.resumes.find({}, {"result": 1}):
        r = doc.get("result", {})
        for w in r.get("weaknesses", []):
            weakness_freq[w] = weakness_freq.get(w, 0) + 1
        for k in r.get("missing_keywords", []):
            keyword_freq[k] = keyword_freq.get(k, 0) + 1
        for s in r.get("strengths", []):
            strength_freq[s] = strength_freq.get(s, 0) + 1

    def top(d, n=10):
        return sorted(d.items(), key=lambda x: -x[1])[:n]

    return {
        "common_weaknesses": [{"label": k, "count": v} for k, v in top(weakness_freq)],
        "missing_keywords": [{"label": k, "count": v} for k, v in top(keyword_freq)],
        "top_strengths": [{"label": k, "count": v} for k, v in top(strength_freq)],
    }


@router.get("/score-distribution")
async def score_distribution(user: dict = Depends(require_admin)):
    db = get_db()
    pipeline = [
        {"$bucket": {
            "groupBy": "$score",
            "boundaries": [0, 20, 40, 60, 80, 101],
            "default": "other",
            "output": {"count": {"$sum": 1}},
        }}
    ]
    data = await db.resumes.aggregate(pipeline).to_list(10)
    labels = ["0-19", "20-39", "40-59", "60-79", "80-100"]
    result = []
    for i, d in enumerate(data):
        if isinstance(d["_id"], (int, float)):
            idx = min(int(d["_id"]) // 20, 4)
            result.append({"range": labels[idx], "count": d["count"]})
    return result
