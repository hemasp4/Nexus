from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel
import os

from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/status", tags=["Status"])

# Status expires after 24 hours
STATUS_EXPIRY_HOURS = 24


class StatusCreate(BaseModel):
    content: Optional[str] = None
    media_id: Optional[str] = None
    media_type: Optional[str] = None  # image, video
    background_color: Optional[str] = "#6366f1"


class StatusResponse(BaseModel):
    id: str
    user_id: str
    username: str
    avatar: Optional[str]
    content: Optional[str]
    media_id: Optional[str]
    media_type: Optional[str]
    background_color: str
    created_at: str
    views: int
    viewed_by_me: bool


@router.get("/my")
async def get_my_statuses(current_user: dict = Depends(get_current_user)):
    """Get current user's statuses"""
    db = get_db()
    user_id = current_user["user_id"]
    
    # Get statuses from last 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=STATUS_EXPIRY_HOURS)
    
    statuses = await db.statuses.find({
        "user_id": user_id,
        "created_at": {"$gte": cutoff_time}
    }).sort("created_at", -1).to_list(50)
    
    result = []
    for status in statuses:
        result.append({
            "id": str(status["_id"]),
            "content": status.get("content"),
            "media_id": status.get("media_id"),
            "media_type": status.get("media_type"),
            "background_color": status.get("background_color", "#6366f1"),
            "created_at": status["created_at"].isoformat(),
            "views": len(status.get("viewed_by", []))
        })
    
    return result


@router.get("/contacts")
async def get_contacts_statuses(current_user: dict = Depends(get_current_user)):
    """Get statuses from user's contacts"""
    db = get_db()
    user_id = current_user["user_id"]
    
    # Get user's contacts
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    contacts = user.get("contacts", [])
    
    # Get statuses from contacts in last 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=STATUS_EXPIRY_HOURS)
    
    # Group statuses by user
    pipeline = [
        {
            "$match": {
                "user_id": {"$in": contacts},
                "created_at": {"$gte": cutoff_time}
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": "$user_id",
                "statuses": {"$push": "$$ROOT"},
                "latest": {"$first": "$created_at"}
            }
        },
        {
            "$sort": {"latest": -1}
        }
    ]
    
    grouped = await db.statuses.aggregate(pipeline).to_list(100)
    
    # Get user info for each contact
    result = {
        "recent": [],
        "viewed": []
    }
    
    for group in grouped:
        contact_id = group["_id"]
        contact = await db.users.find_one({"_id": ObjectId(contact_id)})
        if not contact:
            continue
        
        statuses = group["statuses"]
        
        # Check if all statuses are viewed
        all_viewed = all(
            user_id in s.get("viewed_by", []) 
            for s in statuses
        )
        
        contact_data = {
            "user_id": contact_id,
            "username": contact.get("username", "Unknown"),
            "avatar": contact.get("avatar"),
            "status_count": len(statuses),
            "latest_time": group["latest"].isoformat(),
            "all_viewed": all_viewed
        }
        
        if all_viewed:
            result["viewed"].append(contact_data)
        else:
            result["recent"].append(contact_data)
    
    return result


@router.get("/user/{user_id}")
async def get_user_statuses(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all statuses for a specific user"""
    db = get_db()
    current_user_id = current_user["user_id"]
    
    # Get statuses from last 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=STATUS_EXPIRY_HOURS)
    
    statuses = await db.statuses.find({
        "user_id": user_id,
        "created_at": {"$gte": cutoff_time}
    }).sort("created_at", 1).to_list(50)
    
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    username = user.get("username", "Unknown") if user else "Unknown"
    avatar = user.get("avatar") if user else None
    
    result = []
    for status in statuses:
        viewed_by = status.get("viewed_by", [])
        
        # Mark as viewed if not own status
        if current_user_id != user_id and current_user_id not in viewed_by:
            await db.statuses.update_one(
                {"_id": status["_id"]},
                {"$addToSet": {"viewed_by": current_user_id}}
            )
        
        result.append({
            "id": str(status["_id"]),
            "user_id": user_id,
            "username": username,
            "avatar": avatar,
            "content": status.get("content"),
            "media_id": status.get("media_id"),
            "media_type": status.get("media_type"),
            "background_color": status.get("background_color", "#6366f1"),
            "created_at": status["created_at"].isoformat(),
            "views": len(viewed_by),
            "viewed_by_me": current_user_id in viewed_by
        })
    
    return result


@router.post("")
async def create_status(status_data: StatusCreate, current_user: dict = Depends(get_current_user)):
    """Create a new status"""
    db = get_db()
    user_id = current_user["user_id"]
    
    if not status_data.content and not status_data.media_id:
        raise HTTPException(status_code=400, detail="Status must have content or media")
    
    status = {
        "user_id": user_id,
        "content": status_data.content,
        "media_id": status_data.media_id,
        "media_type": status_data.media_type,
        "background_color": status_data.background_color or "#6366f1",
        "created_at": datetime.utcnow(),
        "viewed_by": []
    }
    
    result = await db.statuses.insert_one(status)
    
    return {
        "id": str(result.inserted_id),
        "message": "Status created successfully"
    }


@router.delete("/{status_id}")
async def delete_status(status_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a status"""
    db = get_db()
    user_id = current_user["user_id"]
    
    result = await db.statuses.delete_one({
        "_id": ObjectId(status_id),
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    
    return {"message": "Status deleted"}


@router.get("/{status_id}/views")
async def get_status_views(status_id: str, current_user: dict = Depends(get_current_user)):
    """Get list of users who viewed a status"""
    db = get_db()
    user_id = current_user["user_id"]
    
    status = await db.statuses.find_one({
        "_id": ObjectId(status_id),
        "user_id": user_id
    })
    
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    viewed_by = status.get("viewed_by", [])
    
    # Get user info for viewers
    viewers = []
    for viewer_id in viewed_by:
        viewer = await db.users.find_one({"_id": ObjectId(viewer_id)})
        if viewer:
            viewers.append({
                "user_id": viewer_id,
                "username": viewer.get("username", "Unknown"),
                "avatar": viewer.get("avatar")
            })
    
    return viewers
