from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/calls", tags=["Calls"])


class CallLogCreate(BaseModel):
    callee_id: str
    call_type: str  # audio, video
    status: str  # completed, missed, rejected, cancelled
    duration: int = 0  # in seconds


class CallLog(BaseModel):
    id: str
    caller_id: str
    caller_name: str
    callee_id: str
    callee_name: str
    call_type: str
    status: str
    duration: int
    timestamp: datetime


@router.get("")
async def get_call_history(current_user: dict = Depends(get_current_user)):
    """Get user's call history"""
    db = get_db()
    user_id = current_user["user_id"]
    
    # Get calls where user is either caller or callee
    calls = await db.call_history.find({
        "$or": [
            {"caller_id": user_id},
            {"callee_id": user_id}
        ]
    }).sort("timestamp", -1).limit(50).to_list(50)
    
    # Format response
    result = []
    for call in calls:
        result.append({
            "id": str(call["_id"]),
            "caller_id": call["caller_id"],
            "caller_name": call.get("caller_name", "Unknown"),
            "callee_id": call["callee_id"],
            "callee_name": call.get("callee_name", "Unknown"),
            "call_type": call["call_type"],
            "status": call["status"],
            "duration": call.get("duration", 0),
            "timestamp": call["timestamp"].isoformat(),
            "is_outgoing": call["caller_id"] == user_id
        })
    
    return result


@router.post("")
async def create_call_log(call_data: CallLogCreate, current_user: dict = Depends(get_current_user)):
    """Create a call log entry"""
    db = get_db()
    user_id = current_user["user_id"]
    
    # Get caller name
    caller = await db.users.find_one({"_id": ObjectId(user_id)})
    caller_name = caller.get("username", "Unknown") if caller else "Unknown"
    
    # Get callee name
    callee = await db.users.find_one({"_id": ObjectId(call_data.callee_id)})
    callee_name = callee.get("username", "Unknown") if callee else "Unknown"
    
    call_log = {
        "caller_id": user_id,
        "caller_name": caller_name,
        "callee_id": call_data.callee_id,
        "callee_name": callee_name,
        "call_type": call_data.call_type,
        "status": call_data.status,
        "duration": call_data.duration,
        "timestamp": datetime.utcnow()
    }
    
    result = await db.call_history.insert_one(call_log)
    
    return {
        "id": str(result.inserted_id),
        "message": "Call log created"
    }


@router.delete("/{call_id}")
async def delete_call_log(call_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a call log entry"""
    db = get_db()
    user_id = current_user["user_id"]
    
    # Only allow deletion if user is part of the call
    result = await db.call_history.delete_one({
        "_id": ObjectId(call_id),
        "$or": [
            {"caller_id": user_id},
            {"callee_id": user_id}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    return {"message": "Call log deleted"}


@router.delete("")
async def clear_call_history(current_user: dict = Depends(get_current_user)):
    """Clear all call history for user"""
    db = get_db()
    user_id = current_user["user_id"]
    
    await db.call_history.delete_many({
        "$or": [
            {"caller_id": user_id},
            {"callee_id": user_id}
        ]
    })
    
    return {"message": "Call history cleared"}
