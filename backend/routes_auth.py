import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from backend.database import get_db
from backend.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

ADMIN_EMAILS = {"admin@resume.com"}  # emails that auto-get admin role


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    try:
        db = get_db()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not connected. Check MONGO_URI env var.")
        existing = await db.users.find_one({"email": req.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        role = "admin" if req.email in ADMIN_EMAILS else "user"
        user_doc = {
            "name": req.name,
            "email": req.email,
            "password": hash_password(req.password),
            "role": role,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        token = create_access_token({"sub": str(result.inserted_id)})

        return {
            "token": token,
            "user": {"id": str(result.inserted_id), "name": req.name, "email": req.email, "role": role},
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REGISTER ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {type(e).__name__}: {str(e)}")


@router.post("/login")
async def login(req: LoginRequest):
    try:
        db = get_db()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not connected. Check MONGO_URI env var.")
        user = await db.users.find_one({"email": req.email})
        if not user or not verify_password(req.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({"sub": str(user["_id"])})

        return {
            "token": token,
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user.get("role", "user")},
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {type(e).__name__}: {str(e)}")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user.get("role", "user")}
