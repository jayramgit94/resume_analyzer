from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import MONGODB_URL, DATABASE_NAME

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Call on app startup (or lazily on first request in serverless)."""
    global client, db
    if db is not None:
        return  # already connected
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.resumes.create_index("user_id")
    await db.resumes.create_index("created_at")
    print(f"[DB] Connected to MongoDB: {DATABASE_NAME}")


async def close_db():
    """Call on app shutdown."""
    global client, db
    if client:
        client.close()
        client = None
        db = None
        print("[DB] MongoDB connection closed")


async def ensure_db():
    """Ensures DB is connected. Safe to call repeatedly (no-op if already connected)."""
    if db is None:
        await connect_db()


def get_db():
    """Return the database instance."""
    return db
