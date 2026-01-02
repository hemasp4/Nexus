from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.message import MessageCreate, MessageResponse
from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/messages", tags=["Messages"])

@router.get("/conversation/{user_id}", response_model=List[MessageResponse])
async def get_conversation(
    user_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages between current user and another user"""
    db = get_db()
    
    query = {
        "$or": [
            {"sender_id": current_user["user_id"], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user["user_id"]}
        ]
    }
    
    if before:
        query["timestamp"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await db.messages.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Get sender info
    result = []
    for msg in reversed(messages):
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        result.append(MessageResponse(
            id=str(msg["_id"]),
            sender_id=msg["sender_id"],
            sender_username=sender["username"] if sender else "Unknown",
            sender_avatar=sender.get("avatar") if sender else None,
            receiver_id=msg.get("receiver_id"),
            room_id=msg.get("room_id"),
            content=msg["content"],
            message_type=msg.get("message_type", "text"),
            file_id=msg.get("file_id"),
            file_name=msg.get("file_name"),
            file_size=msg.get("file_size"),
            reply_to=msg.get("reply_to"),
            read_by=msg.get("read_by", []),
            delivered_to=msg.get("delivered_to", []),
            timestamp=msg["timestamp"],
            edited=msg.get("edited", False),
            deleted=msg.get("deleted", False)
        ))
    
    return result

@router.get("/room/{room_id}", response_model=List[MessageResponse])
async def get_room_messages(
    room_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages in a room/group"""
    db = get_db()
    
    query = {"room_id": room_id}
    
    if before:
        query["timestamp"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await db.messages.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    result = []
    for msg in reversed(messages):
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        result.append(MessageResponse(
            id=str(msg["_id"]),
            sender_id=msg["sender_id"],
            sender_username=sender["username"] if sender else "Unknown",
            sender_avatar=sender.get("avatar") if sender else None,
            room_id=msg.get("room_id"),
            content=msg["content"],
            message_type=msg.get("message_type", "text"),
            file_id=msg.get("file_id"),
            file_name=msg.get("file_name"),
            file_size=msg.get("file_size"),
            reply_to=msg.get("reply_to"),
            read_by=msg.get("read_by", []),
            delivered_to=msg.get("delivered_to", []),
            timestamp=msg["timestamp"],
            edited=msg.get("edited", False),
            deleted=msg.get("deleted", False)
        ))
    
    return result


@router.get("/starred", response_model=List[MessageResponse])
async def get_starred_messages(current_user: dict = Depends(get_current_user)):
    """Get all starred messages for the current user"""
    db = get_db()
    
    # Find all messages where current user is in starred_by array
    messages = await db.messages.find({
        "starred_by": current_user["user_id"],
        "deleted": {"$ne": True}
    }).sort("timestamp", -1).to_list(length=100)
    
    result = []
    for msg in messages:
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        result.append(MessageResponse(
            id=str(msg["_id"]),
            sender_id=msg["sender_id"],
            sender_username=sender["username"] if sender else "Unknown",
            sender_avatar=sender.get("avatar") if sender else None,
            receiver_id=msg.get("receiver_id"),
            room_id=msg.get("room_id"),
            content=msg["content"],
            message_type=msg.get("message_type", "text"),
            file_id=msg.get("file_id"),
            file_name=msg.get("file_name"),
            file_size=msg.get("file_size"),
            reply_to=msg.get("reply_to"),
            read_by=msg.get("read_by", []),
            delivered_to=msg.get("delivered_to", []),
            starred_by=msg.get("starred_by", []),
            timestamp=msg["timestamp"],
            edited=msg.get("edited", False),
            deleted=msg.get("deleted", False)
        ))
    
    return result


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message (REST fallback)"""
    db = get_db()
    
    message_dict = {
        "sender_id": current_user["user_id"],
        "receiver_id": message_data.receiver_id,
        "room_id": message_data.room_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "file_id": message_data.file_id,
        "file_name": message_data.file_name,
        "file_size": message_data.file_size,
        "reply_to": message_data.reply_to,
        "read_by": [],
        "delivered_to": [],
        "timestamp": datetime.utcnow(),
        "edited": False,
        "deleted": False
    }
    
    result = await db.messages.insert_one(message_dict)
    
    sender = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return MessageResponse(
        id=str(result.inserted_id),
        sender_id=current_user["user_id"],
        sender_username=sender["username"],
        sender_avatar=sender.get("avatar"),
        receiver_id=message_data.receiver_id,
        room_id=message_data.room_id,
        content=message_data.content,
        message_type=message_data.message_type,
        file_id=message_data.file_id,
        file_name=message_data.file_name,
        file_size=message_data.file_size,
        reply_to=message_data.reply_to,
        read_by=[],
        delivered_to=[],
        timestamp=message_dict["timestamp"],
        edited=False,
        deleted=False
    )

@router.put("/{message_id}/read")
async def mark_as_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark message as read"""
    db = get_db()
    
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$addToSet": {"read_by": current_user["user_id"]}}
    )
    
    return {"message": "Marked as read"}

@router.delete("/{message_id}")
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a message (soft delete)"""
    db = get_db()
    
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message["sender_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")
    
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"deleted": True, "content": "This message was deleted"}}
    )
    
    return {"message": "Message deleted"}


@router.post("/{message_id}/star")
async def star_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Star a message for the current user"""
    db = get_db()
    
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Add user to starred_by array
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$addToSet": {"starred_by": current_user["user_id"]}}
    )
    
    return {"message": "Message starred", "starred": True}


@router.delete("/{message_id}/star")
async def unstar_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Unstar a message for the current user"""
    db = get_db()
    
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Remove user from starred_by array
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$pull": {"starred_by": current_user["user_id"]}}
    )
    
    return {"message": "Message unstarred", "starred": False}
