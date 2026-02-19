import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import MONGODB_URL, DATABASE_NAME

client: AsyncIOMotorClient = None
db = None
_current_loop = None  # track the event loop the client was created on


async def connect_db():
    """Call on app startup (or lazily on first request in serverless)."""
    global client, db, _current_loop
    # Always create a fresh client — Vercel serverless may reuse the process
    # but with a NEW event loop, making the old Motor client unusable.
    if client is not None:
        try:
            client.close()
        except Exception:
            pass
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    _current_loop = asyncio.get_running_loop()

    # Create indexes (safe to call repeatedly — MongoDB is idempotent)
    await db.users.create_index("email", unique=True)
    await db.resumes.create_index("user_id")
    await db.resumes.create_index("created_at")
    print(f"[DB] Connected to MongoDB: {DATABASE_NAME}")


async def close_db():
    """Call on app shutdown."""
    global client, db, _current_loop
    if client:
        client.close()
        client = None
        db = None
        _current_loop = None
        print("[DB] MongoDB connection closed")


async def ensure_db():
    """Ensures DB is connected and the event loop hasn't changed (Vercel serverless fix)."""
    global _current_loop
    current_loop = asyncio.get_running_loop()
    if db is None or _current_loop is not current_loop:
        # Event loop changed (Vercel warm restart) or first call — reconnect
        await connect_db()


def get_db():
    """Return the database instance."""
    return db
