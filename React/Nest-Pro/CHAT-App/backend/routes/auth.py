from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId

import sys
sys.path.append('..')

from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserInDB, UserSettings
from utils.auth import hash_password, verify_password, create_access_token
from utils.db import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        db = get_db()
        
        if db is None:
            raise HTTPException(
                status_code=503, 
                detail="Database not available. Please ensure MongoDB is running."
            )
        
        # Check if user exists
        existing_user = await db.users.find_one({
            "$or": [
                {"email": user_data.email},
                {"username": user_data.username}
            ]
        })
        
        if existing_user:
            if existing_user.get("email") == user_data.email:
                raise HTTPException(status_code=400, detail="Email already registered")
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create user
        user_dict = UserInDB(
            username=user_data.username,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            created_at=datetime.utcnow()
        ).model_dump()
        
        result = await db.users.insert_one(user_dict)
        user_id = str(result.inserted_id)
        
        # Create token
        token = create_access_token(user_id, user_data.username)
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user_id,
                username=user_data.username,
                email=user_data.email,
                created_at=user_dict["created_at"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    try:
        db = get_db()
        
        if db is None:
            raise HTTPException(
                status_code=503, 
                detail="Database not available. Please ensure MongoDB is running."
            )
        
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id = str(user["_id"])
        
        # Update status
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"status": "online", "last_seen": datetime.utcnow()}}
        )
        
        # Create token
        token = create_access_token(user_id, user["username"])
        
        # Get or create settings
        settings_data = user.get("settings", {})
        user_settings = UserSettings(**settings_data)
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user_id,
                username=user["username"],
                email=user["email"],
                avatar=user.get("avatar"),
                status="online",
                about=user.get("about", "Hey there! I'm using NexusChat"),
                contacts=user.get("contacts", []),
                created_at=user["created_at"],
                settings=user_settings
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = None):
    """Get current user info - requires auth middleware"""
    from utils.auth import get_current_user
    from fastapi import Depends
    # This will be called with dependency injection
    pass

@router.post("/logout")
async def logout():
    """Logout user - client should delete token"""
    return {"message": "Logged out successfully"}
