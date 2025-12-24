from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import UserResponse, UserUpdate, UserPublic, UserSettings
from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/search", response_model=List[UserPublic])
async def search_users(
    q: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Search users by username or email"""
    db = get_db()
    
    users = await db.users.find({
        "$and": [
            {"_id": {"$ne": ObjectId(current_user["user_id"])}},
            {"$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ]}
        ]
    }).limit(limit).to_list(length=limit)
    
    return [
        UserPublic(
            id=str(user["_id"]),
            username=user["username"],
            avatar=user.get("avatar"),
            status=user.get("status", "offline"),
            about=user.get("about", "Hey there! I'm using NexusChat")
        )
        for user in users
    ]

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get settings
    settings_data = user.get("settings", {})
    user_settings = UserSettings(**settings_data)
    
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        avatar=user.get("avatar"),
        status=user.get("status", "offline"),
        about=user.get("about", "Hey there! I'm using NexusChat"),
        contacts=user.get("contacts", []),
        created_at=user["created_at"],
        settings=user_settings
    )

@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user by ID"""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublic(
        id=str(user["_id"]),
        username=user["username"],
        avatar=user.get("avatar"),
        status=user.get("status", "offline"),
        about=user.get("about", "Hey there! I'm using NexusChat")
    )

@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    db = get_db()
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"_id": ObjectId(current_user["user_id"])},
            {"$set": update_dict}
        )
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        avatar=user.get("avatar"),
        status=user.get("status", "offline"),
        about=user.get("about", "Hey there! I'm using NexusChat"),
        contacts=user.get("contacts", []),
        created_at=user["created_at"]
    )

@router.post("/contacts/{contact_id}")
async def add_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Add a contact (mutual add)"""
    db = get_db()
    
    # Can't add yourself
    if contact_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself as contact")
    
    # Check if contact exists
    contact = await db.users.find_one({"_id": ObjectId(contact_id)})
    if not contact:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add to current user's contacts list
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$addToSet": {"contacts": contact_id}}
    )
    
    # Also add current user to contact's contacts list (mutual add)
    await db.users.update_one(
        {"_id": ObjectId(contact_id)},
        {"$addToSet": {"contacts": current_user["user_id"]}}
    )
    
    return {"message": "Contact added successfully"}

@router.delete("/contacts/{contact_id}")
async def remove_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a contact"""
    db = get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$pull": {"contacts": contact_id}}
    )
    
    return {"message": "Contact removed successfully"}

@router.get("/contacts/list", response_model=List[UserPublic])
async def get_contacts(current_user: dict = Depends(get_current_user)):
    """Get all contacts"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    contact_ids = user.get("contacts", [])
    
    if not contact_ids:
        return []
    
    contacts = await db.users.find({
        "_id": {"$in": [ObjectId(cid) for cid in contact_ids]}
    }).to_list(length=100)
    
    return [
        UserPublic(
            id=str(contact["_id"]),
            username=contact["username"],
            avatar=contact.get("avatar"),
            status=contact.get("status", "offline"),
            about=contact.get("about", "Hey there! I'm using NexusChat")
        )
        for contact in contacts
    ]
