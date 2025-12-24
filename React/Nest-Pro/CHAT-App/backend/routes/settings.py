from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from passlib.context import CryptContext

from models.user import UserSettings, SettingsUpdate, PasswordChange, UserPublic
from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/settings", tags=["Settings"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("", response_model=UserSettings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get user settings"""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    settings_data = user.get("settings", {})
    return UserSettings(**settings_data)

@router.put("", response_model=UserSettings)
async def update_settings(
    settings: SettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user settings"""
    db = get_db()
    
    # Get current settings
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_settings = user.get("settings", {})
    
    # Merge with new settings
    update_dict = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    # Validate theme value
    if "theme" in update_dict and update_dict["theme"] not in ["dark", "light", "system"]:
        raise HTTPException(status_code=400, detail="Invalid theme value")
    
    # Validate font_size value
    if "font_size" in update_dict and update_dict["font_size"] not in ["small", "medium", "large"]:
        raise HTTPException(status_code=400, detail="Invalid font_size value")
    
    # Validate visibility values
    visibility_fields = ["last_seen_visibility", "profile_photo_visibility", "about_visibility"]
    for field in visibility_fields:
        if field in update_dict and update_dict[field] not in ["everyone", "contacts", "nobody"]:
            raise HTTPException(status_code=400, detail=f"Invalid {field} value")
    
    # Update settings in nested document
    for key, value in update_dict.items():
        current_settings[key] = value
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"settings": current_settings}}
    )
    
    return UserSettings(**current_settings)

@router.put("/password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not pwd_context.verify(password_data.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Hash new password
    new_hash = pwd_context.hash(password_data.new_password)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

# Block/Unblock routes (under /api/users prefix, but in this file for organization)
block_router = APIRouter(prefix="/api/users", tags=["Block"])

@block_router.get("/blocked", response_model=list[UserPublic])
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    """Get list of blocked users"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    blocked_ids = user.get("blocked", [])
    if not blocked_ids:
        return []
    
    blocked_users = await db.users.find({
        "_id": {"$in": [ObjectId(bid) for bid in blocked_ids]}
    }).to_list(length=100)
    
    return [
        UserPublic(
            id=str(u["_id"]),
            username=u["username"],
            avatar=u.get("avatar"),
            status=u.get("status", "offline"),
            about=u.get("about", "Hey there! I'm using NexusChat")
        )
        for u in blocked_users
    ]

@block_router.post("/block/{user_id}")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Block a user"""
    db = get_db()
    
    # Check if user exists
    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't block yourself
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Add to blocked list
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$addToSet": {"blocked": user_id}}
    )
    
    # Remove from contacts if present
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$pull": {"contacts": user_id}}
    )
    
    return {"message": "User blocked successfully"}

@block_router.delete("/block/{user_id}")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Unblock a user"""
    db = get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$pull": {"blocked": user_id}}
    )
    
    return {"message": "User unblocked successfully"}
