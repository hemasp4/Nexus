from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.room import RoomCreate, RoomUpdate, RoomResponse
from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/rooms", tags=["Rooms/Groups"])

@router.post("/", response_model=RoomResponse)
async def create_room(
    room_data: RoomCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new group/room"""
    db = get_db()
    
    # Include creator in members and as admin
    members = list(set([current_user["user_id"]] + room_data.members))
    
    room_dict = {
        "name": room_data.name,
        "description": room_data.description,
        "avatar": room_data.avatar,
        "members": members,
        "admins": [current_user["user_id"]],
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow(),
        "last_message": None,
        "last_message_time": None
    }
    
    result = await db.rooms.insert_one(room_dict)
    
    return RoomResponse(
        id=str(result.inserted_id),
        **{k: v for k, v in room_dict.items() if k != "_id"}
    )

@router.get("/", response_model=List[RoomResponse])
async def get_user_rooms(current_user: dict = Depends(get_current_user)):
    """Get all rooms user is a member of"""
    db = get_db()
    
    rooms = await db.rooms.find({
        "members": current_user["user_id"]
    }).to_list(length=100)
    
    return [
        RoomResponse(
            id=str(room["_id"]),
            name=room["name"],
            description=room.get("description"),
            avatar=room.get("avatar"),
            members=room.get("members", []),
            admins=room.get("admins", []),
            created_by=room["created_by"],
            created_at=room["created_at"],
            last_message=room.get("last_message"),
            last_message_time=room.get("last_message_time")
        )
        for room in rooms
    ]

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, current_user: dict = Depends(get_current_user)):
    """Get room details"""
    db = get_db()
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user["user_id"] not in room.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this room")
    
    return RoomResponse(
        id=str(room["_id"]),
        name=room["name"],
        description=room.get("description"),
        avatar=room.get("avatar"),
        members=room.get("members", []),
        admins=room.get("admins", []),
        created_by=room["created_by"],
        created_at=room["created_at"],
        last_message=room.get("last_message"),
        last_message_time=room.get("last_message_time")
    )

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    update_data: RoomUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update room details (admin only)"""
    db = get_db()
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user["user_id"] not in room.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can update room")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": update_dict}
        )
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    return RoomResponse(
        id=str(room["_id"]),
        name=room["name"],
        description=room.get("description"),
        avatar=room.get("avatar"),
        members=room.get("members", []),
        admins=room.get("admins", []),
        created_by=room["created_by"],
        created_at=room["created_at"],
        last_message=room.get("last_message"),
        last_message_time=room.get("last_message_time")
    )

@router.post("/{room_id}/members/{user_id}")
async def add_member(
    room_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a member to room"""
    db = get_db()
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user["user_id"] not in room.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    # Check if user exists
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$addToSet": {"members": user_id}}
    )
    
    return {"message": "Member added successfully"}

@router.delete("/{room_id}/members/{user_id}")
async def remove_member(
    room_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a member from room"""
    db = get_db()
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # User can leave OR admin can remove
    if current_user["user_id"] != user_id and current_user["user_id"] not in room.get("admins", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$pull": {"members": user_id, "admins": user_id}}
    )
    
    return {"message": "Member removed successfully"}

@router.delete("/{room_id}")
async def delete_room(room_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a room (creator only)"""
    db = get_db()
    
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["created_by"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only creator can delete room")
    
    await db.rooms.delete_one({"_id": ObjectId(room_id)})
    
    # Also delete all messages in room
    await db.messages.delete_many({"room_id": room_id})
    
    return {"message": "Room deleted successfully"}
