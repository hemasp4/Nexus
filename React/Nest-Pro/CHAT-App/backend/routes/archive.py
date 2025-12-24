from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
import hashlib
import random
import string
from datetime import datetime, timedelta

from models.user import ArchivePinSet, ArchivePinVerify, ForgotPinRequest, ResetPinRequest
from utils.auth import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/api/archive", tags=["Archive"])

# In-memory OTP storage (in production, use Redis or database)
otp_storage = {}

def hash_pin(pin: str) -> str:
    """Hash a 4-digit PIN"""
    return hashlib.sha256(pin.encode()).hexdigest()

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


@router.get("")
async def get_archived_chats(current_user: dict = Depends(get_current_user)):
    """Get list of archived chat IDs"""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "archived_chats": user.get("archived_chats", []),
        "has_pin": user.get("archive_pin_hash") is not None
    }


@router.post("/chat/{chat_id}")
async def archive_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    """Archive a chat"""
    db = get_db()
    
    result = await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$addToSet": {"archived_chats": chat_id}}
    )
    
    if result.modified_count == 0:
        # Check if already archived
        user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
        if chat_id in user.get("archived_chats", []):
            return {"message": "Chat already archived", "chat_id": chat_id}
    
    return {"message": "Chat archived", "chat_id": chat_id}


@router.delete("/chat/{chat_id}")
async def unarchive_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    """Unarchive a chat"""
    db = get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$pull": {"archived_chats": chat_id}}
    )
    
    return {"message": "Chat unarchived", "chat_id": chat_id}


@router.put("/pin")
async def set_archive_pin(pin_data: ArchivePinSet, current_user: dict = Depends(get_current_user)):
    """Set or update the archive PIN"""
    db = get_db()
    
    pin_hash = hash_pin(pin_data.pin)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"archive_pin_hash": pin_hash}}
    )
    
    return {"message": "Archive PIN set successfully"}


@router.post("/verify")
async def verify_archive_pin(pin_data: ArchivePinVerify, current_user: dict = Depends(get_current_user)):
    """Verify the archive PIN"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    stored_hash = user.get("archive_pin_hash")
    
    if not stored_hash:
        raise HTTPException(status_code=400, detail="No PIN set. Please set a PIN first.")
    
    if hash_pin(pin_data.pin) != stored_hash:
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    
    return {"message": "PIN verified", "success": True}


@router.get("/has-pin")
async def check_has_pin(current_user: dict = Depends(get_current_user)):
    """Check if user has set an archive PIN"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"has_pin": user.get("archive_pin_hash") is not None}


@router.post("/forgot-pin")
async def forgot_pin(request: ForgotPinRequest, current_user: dict = Depends(get_current_user)):
    """Request OTP to reset archive PIN"""
    db = get_db()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email") != request.email:
        raise HTTPException(status_code=400, detail="Email does not match your account")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP with expiry (5 minutes)
    otp_storage[current_user["user_id"]] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=5)
    }
    
    # In production, send OTP via email
    # For now, we'll return it (REMOVE IN PRODUCTION)
    print(f"OTP for user {current_user['user_id']}: {otp}")
    
    # TODO: Implement email sending
    # await send_email(user["email"], "Your Archive PIN Reset OTP", f"Your OTP is: {otp}")
    
    return {
        "message": "OTP sent to your email",
        "email": user["email"][:3] + "***" + user["email"][user["email"].index("@"):],
        # REMOVE IN PRODUCTION - only for testing
        "debug_otp": otp
    }


@router.post("/reset-pin")
async def reset_pin(request: ResetPinRequest, current_user: dict = Depends(get_current_user)):
    """Reset archive PIN using OTP"""
    db = get_db()
    
    # Check OTP
    stored_otp = otp_storage.get(current_user["user_id"])
    
    if not stored_otp:
        raise HTTPException(status_code=400, detail="No OTP requested. Please request a new OTP.")
    
    if datetime.utcnow() > stored_otp["expires"]:
        del otp_storage[current_user["user_id"]]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    
    if stored_otp["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")
    
    # OTP verified, set new PIN
    pin_hash = hash_pin(request.new_pin)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"archive_pin_hash": pin_hash}}
    )
    
    # Clear OTP
    del otp_storage[current_user["user_id"]]
    
    return {"message": "PIN reset successfully"}
