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


# ------------------------
# Run
# ------------------------
if __name__ == "__main__":
    import uvicorn
    print("\n\033[92mVisit http://localhost:8000 in your browser to use the Resume Analyzer.\033[0m\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
