from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None
    fs = None

db = Database()

async def connect_db():
    """Connect to MongoDB"""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DATABASE_NAME]
    db.fs = AsyncIOMotorGridFSBucket(db.db)
    
    # Create indexes
    await db.db.users.create_index("email", unique=True)
    await db.db.users.create_index("username", unique=True)
    await db.db.messages.create_index([("sender_id", 1), ("receiver_id", 1)])
    await db.db.messages.create_index("room_id")
    
    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")

async def disconnect_db():
    """Disconnect from MongoDB"""
    if db.client:
        db.client.close()
        print("❌ Disconnected from MongoDB")

def get_db():
    return db.db

def get_fs():
    return db.fs
