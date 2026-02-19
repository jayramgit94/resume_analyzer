from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.database import connect_db, close_db, ensure_db
from backend.routes_auth import router as auth_router
from backend.routes_resume import router as resume_router
from backend.routes_admin import router as admin_router


# ------------------------
# Lifespan: connect/close MongoDB
# ------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


# ------------------------
# APP SETUP
# ------------------------
app = FastAPI(title="AI Resume Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ensure_db_middleware(request: Request, call_next):
    """In serverless (Vercel), lifespan events don't run.
    This ensures MongoDB is connected before every request."""
    await ensure_db()
    return await call_next(request)

# --- Register routers ---
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "AI Resume Analyzer API"}


@app.get("/debug/health")
async def debug_health():
    """Debug endpoint to check DB connection and env vars on Vercel."""
    import os
    from backend.database import get_db
    info = {
        "mongo_uri_set": bool(os.environ.get("MONGO_URI")),
        "jwt_secret_set": bool(os.environ.get("JWT_SECRET")),
        "gemini_key_set": bool(os.environ.get("GEMINI_API_KEY")),
        "db_connected": get_db() is not None,
    }
    # Test actual DB ping
    try:
        db = get_db()
        if db is not None:
            await db.command("ping")
            info["db_ping"] = "ok"
        else:
            info["db_ping"] = "db is None"
    except Exception as e:
        info["db_ping"] = f"error: {type(e).__name__}: {str(e)}"
    return info


# ------------------------
# Run
# ------------------------
if __name__ == "__main__":
    import uvicorn
    print("\n\033[92mVisit http://localhost:8000 in your browser to use the Resume Analyzer.\033[0m\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
