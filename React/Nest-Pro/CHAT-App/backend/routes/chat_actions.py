"""
Pin and Chat Actions API Routes
Handles message pinning, chat archiving, pin-to-top, mark-unread, and deleted files
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId

from utils.db import get_db
from utils.auth import decode_token

router = APIRouter(prefix="/api", tags=["chat-actions"])

# ============ MODELS ============

class PinMessageRequest(BaseModel):
    duration: str  # "24h", "7d", "30d", or custom minutes as string
    custom_minutes: Optional[int] = None

class ChatActionRequest(BaseModel):
    action: str  # "archive", "unarchive", "pin_to_top", "unpin_from_top", "mark_unread", "mark_read"

# ============ PIN MESSAGE ENDPOINTS ============

@router.post("/messages/{message_id}/pin")
async def pin_message(message_id: str, request: PinMessageRequest, db=Depends(get_db)):
    """Pin a message with expiry duration"""
    try:
        # Calculate expiry time
        now = datetime.utcnow()
        if request.duration == "24h":
            expires_at = now + timedelta(hours=24)
        elif request.duration == "7d":
            expires_at = now + timedelta(days=7)
        elif request.duration == "30d":
            expires_at = now + timedelta(days=30)
        elif request.duration == "custom" and request.custom_minutes:
            expires_at = now + timedelta(minutes=request.custom_minutes)
        else:
            expires_at = now + timedelta(days=7)  # Default 7 days

        # Get message to find chat_id
        message = await db.messages.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Create or update pin
        pin_data = {
            "message_id": message_id,
            "chat_id": message.get("chat_id") or message.get("room_id"),
            "chat_type": "room" if message.get("room_id") else "direct",
            "pinned_at": now,
            "expires_at": expires_at,
            "pinned_by": message.get("sender_id"),
            "message_content": message.get("content", "")[:100],
            "message_type": message.get("message_type", "text")
        }

        await db.pinned_messages.update_one(
            {"message_id": message_id},
            {"$set": pin_data},
            upsert=True
        )

        return {"success": True, "message": "Message pinned", "expires_at": expires_at.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages/{message_id}/pin")
async def unpin_message(message_id: str, db=Depends(get_db)):
    """Unpin a message"""
    try:
        result = await db.pinned_messages.delete_one({"message_id": message_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Pin not found")
        return {"success": True, "message": "Message unpinned"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/{chat_id}/pins")
async def get_chat_pins(chat_id: str, db=Depends(get_db)):
    """Get all pinned messages for a chat"""
    try:
        now = datetime.utcnow()
        
        # Remove expired pins
        await db.pinned_messages.delete_many({"expires_at": {"$lt": now}})
        
        # Get active pins
        pins = await db.pinned_messages.find({"chat_id": chat_id}).to_list(100)
        
        # Convert ObjectId to string
        for pin in pins:
            pin["_id"] = str(pin["_id"])
            pin["pinned_at"] = pin["pinned_at"].isoformat() if pin.get("pinned_at") else None
            pin["expires_at"] = pin["expires_at"].isoformat() if pin.get("expires_at") else None
        
        return {"pins": pins}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ CHAT ACTION ENDPOINTS ============

@router.post("/chats/{chat_id}/action")
async def chat_action(chat_id: str, request: ChatActionRequest, db=Depends(get_db)):
    """Perform action on a chat (archive, pin-to-top, mark-unread, clear, delete)"""
    try:
        action = request.action
        now = datetime.utcnow()
        
        if action == "archive":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"archived": True, "archived_at": now}},
                upsert=True
            )
        elif action == "unarchive":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"archived": False}},
                upsert=True
            )
        elif action == "pin_to_top":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"pinned_to_top": True, "pinned_at": now}},
                upsert=True
            )
        elif action == "unpin_from_top":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"pinned_to_top": False}},
                upsert=True
            )
        elif action == "mark_unread":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"unread": True}},
                upsert=True
            )
        elif action == "mark_read":
            await db.chat_states.update_one(
                {"chat_id": chat_id},
                {"$set": {"unread": False}},
                upsert=True
            )
        elif action == "clear_messages":
            # Clear all messages in the chat (soft delete)
            await db.messages.update_many(
                {"$or": [{"chat_id": chat_id}, {"receiver_id": chat_id}, {"sender_id": chat_id}]},
                {"$set": {"deleted": True, "deleted_at": now}}
            )
        elif action == "delete_chat":
            # Delete chat permanently - remove messages and chat state
            await db.messages.delete_many(
                {"$or": [{"chat_id": chat_id}, {"receiver_id": chat_id}, {"sender_id": chat_id}]}
            )
            await db.chat_states.delete_one({"chat_id": chat_id})
            await db.contacts.delete_many({"contact_id": chat_id})
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        return {"success": True, "action": action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/{chat_id}/state")
async def get_chat_state(chat_id: str, db=Depends(get_db)):
    """Get chat state (archived, pinned, unread)"""
    try:
        state = await db.chat_states.find_one({"chat_id": chat_id})
        if not state:
            return {"archived": False, "pinned_to_top": False, "unread": False}
        
        state["_id"] = str(state["_id"])
        return state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/archived")
async def get_archived_chats(db=Depends(get_db)):
    """Get all archived chats"""
    try:
        archived = await db.chat_states.find({"archived": True}).to_list(100)
        
        for chat in archived:
            chat["_id"] = str(chat["_id"])
            chat["archived_at"] = chat["archived_at"].isoformat() if chat.get("archived_at") else None
        
        return {"chats": archived}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ DELETED FILES ENDPOINTS ============

@router.post("/files/{file_id}/soft-delete")
async def soft_delete_file(file_id: str, db=Depends(get_db)):
    """Soft delete a file (30-day retention)"""
    try:
        now = datetime.utcnow()
        permanent_delete_at = now + timedelta(days=30)
        
        await db.deleted_files.update_one(
            {"file_id": file_id},
            {"$set": {
                "file_id": file_id,
                "deleted_at": now,
                "permanent_delete_at": permanent_delete_at
            }},
            upsert=True
        )
        
        return {"success": True, "message": "File moved to trash", "restore_until": permanent_delete_at.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/{file_id}/restore")
async def restore_file(file_id: str, db=Depends(get_db)):
    """Restore a soft-deleted file"""
    try:
        deleted = await db.deleted_files.find_one({"file_id": file_id})
        if not deleted:
            raise HTTPException(status_code=404, detail="File not in trash")
        
        if datetime.utcnow() > deleted.get("permanent_delete_at", datetime.utcnow()):
            raise HTTPException(status_code=410, detail="File has been permanently deleted")
        
        await db.deleted_files.delete_one({"file_id": file_id})
        return {"success": True, "message": "File restored"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/deleted")
async def get_deleted_files(db=Depends(get_db)):
    """Get all deleted files (not yet permanently deleted)"""
    try:
        now = datetime.utcnow()
        
        # Clean up permanently deleted files
        await db.deleted_files.delete_many({"permanent_delete_at": {"$lt": now}})
        
        # Get remaining deleted files
        files = await db.deleted_files.find().to_list(100)
        
        for f in files:
            f["_id"] = str(f["_id"])
            f["deleted_at"] = f["deleted_at"].isoformat() if f.get("deleted_at") else None
            f["permanent_delete_at"] = f["permanent_delete_at"].isoformat() if f.get("permanent_delete_at") else None
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
