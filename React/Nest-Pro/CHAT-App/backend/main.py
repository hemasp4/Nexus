from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager
import json
import uuid
import os
from datetime import datetime
from bson import ObjectId

from config import settings
from utils.db import connect_db, disconnect_db, get_db
from utils.auth import decode_token
from services.websocket import manager
from services.webrtc import call_manager, create_offer_message, create_answer_message, create_ice_candidate_message, create_call_ended_message

# Import routes
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.messages import router as messages_router
from routes.files import router as files_router
from routes.ai import router as ai_router
from routes.rooms import router as rooms_router
from routes.settings import router as settings_router, block_router
from routes.archive import router as archive_router
from routes.calls import router as calls_router
from routes.status import router as status_router

# Get absolute path to frontend directory
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    try:
        await connect_db()
    except Exception as e:
        print(f"⚠️ Warning: Could not connect to MongoDB: {e}")
        print("⚠️ Some features requiring database may not work")
    yield
    await disconnect_db()

app = FastAPI(
    title="NexusChat API",
    description="Real-time chat application with AI assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(messages_router)
app.include_router(files_router)
app.include_router(ai_router)
app.include_router(rooms_router)
app.include_router(settings_router)
app.include_router(block_router)
app.include_router(archive_router)
app.include_router(calls_router)
app.include_router(status_router)

# Get absolute path to frontend directory - more robust
import pathlib
BACKEND_DIR = pathlib.Path(__file__).parent.resolve()
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
print(f"📂 Frontend directory: {FRONTEND_DIR}")
print(f"📂 CSS directory exists: {(FRONTEND_DIR / 'css').exists()}")
print(f"📂 JS directory exists: {(FRONTEND_DIR / 'js').exists()}")

# Mount static files (frontend) - CSS and JS
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


@app.get("/")
async def root():
    """Serve login page"""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/chat")
async def chat_page():
    """Serve chat page"""
    return FileResponse(str(FRONTEND_DIR / "chat.html"))


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = None):
    """WebSocket endpoint for real-time messaging"""
    
    # Authenticate - get token from query parameter
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = decode_token(token)
        token_user_id = payload.get("sub")
        username = payload.get("username")
        
        # Verify the user_id matches the token
        if token_user_id != user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return
    
    # Connect
    await manager.connect(websocket, user_id)
    
    # Send list of online users to the newly connected client
    online_users = manager.get_online_users()
    await websocket.send_json({
        "type": "online_users",
        "users": online_users
    })
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            msg_type = message_data.get("type")
            
            if msg_type == "message":
                # Handle chat message
                await handle_chat_message(user_id, username, message_data)
            
            elif msg_type == "typing":
                # Handle typing indicator
                await handle_typing(user_id, username, message_data)
            
            elif msg_type == "read":
                # Handle read receipt
                await handle_read_receipt(user_id, message_data)
            
            elif msg_type == "call_offer":
                # Handle call offer
                await handle_call_offer(user_id, username, message_data)
            
            elif msg_type == "call_answer":
                # Handle call answer
                await handle_call_answer(user_id, message_data)
            
            elif msg_type == "ice_candidate":
                # Handle ICE candidate
                await handle_ice_candidate(user_id, message_data)
            
            elif msg_type == "call_end":
                # Handle call end
                await handle_call_end(user_id, message_data)
            
            elif msg_type == "join_room":
                # Handle room join
                room_id = message_data.get("room_id")
                manager.join_room(room_id, user_id)
            
            elif msg_type == "leave_room":
                # Handle room leave
                room_id = message_data.get("room_id")
                manager.leave_room(room_id, user_id)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
        # Update user status in DB
        db = get_db()
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "offline", "last_seen": datetime.utcnow()}}
        )


async def handle_chat_message(sender_id: str, sender_username: str, data: dict):
    """Handle incoming chat message"""
    db = get_db()
    
    print(f"📨 Message from {sender_username} ({sender_id})")
    print(f"   To receiver: {data.get('receiver_id')}, Room: {data.get('room_id')}")
    
    # Get sender info for avatar
    sender = await db.users.find_one({"_id": ObjectId(sender_id)})
    
    # Save message to DB
    message_doc = {
        "sender_id": sender_id,
        "receiver_id": data.get("receiver_id"),
        "room_id": data.get("room_id"),
        "content": data.get("content", ""),
        "message_type": data.get("message_type", "text"),
        "file_id": data.get("file_id"),
        "file_name": data.get("file_name"),
        "file_size": data.get("file_size"),
        "reply_to": data.get("reply_to"),
        "read_by": [],
        "delivered_to": [],
        "timestamp": datetime.utcnow(),
        "edited": False,
        "deleted": False
    }
    
    result = await db.messages.insert_one(message_doc)
    print(f"   Message saved with ID: {result.inserted_id}")
    
    # Build response message
    response = {
        "type": "message",
        "id": str(result.inserted_id),
        "sender_id": sender_id,
        "sender_username": sender_username,
        "sender_avatar": sender.get("avatar") if sender else None,
        "receiver_id": data.get("receiver_id"),
        "room_id": data.get("room_id"),
        "content": data.get("content", ""),
        "message_type": data.get("message_type", "text"),
        "file_id": data.get("file_id"),
        "file_name": data.get("file_name"),
        "file_size": data.get("file_size"),
        "reply_to": data.get("reply_to"),
        "timestamp": message_doc["timestamp"].isoformat()
    }
    
    if data.get("receiver_id"):
        # Direct message - send to receiver and echo back to sender
        receiver_id = data["receiver_id"]
        print(f"   Sending to receiver: {receiver_id}")
        print(f"   Online users: {list(manager.active_connections.keys())}")
        
        await manager.send_personal(receiver_id, response)
        await manager.send_personal(sender_id, response)  # Echo back to sender
        print(f"   ✅ Message sent to both parties")
    elif data.get("room_id"):
        # Room message
        await manager.broadcast_to_room(data["room_id"], response)
        print(f"   ✅ Message broadcast to room {data['room_id']}")


async def handle_typing(user_id: str, username: str, data: dict):
    """Handle typing indicator"""
    message = {
        "type": "typing",
        "user_id": user_id,
        "username": username,
        "is_typing": data.get("is_typing", True)
    }
    
    if data.get("receiver_id"):
        await manager.send_personal(data["receiver_id"], message)
    elif data.get("room_id"):
        await manager.broadcast_to_room(data["room_id"], message, exclude_user=user_id)


async def handle_read_receipt(user_id: str, data: dict):
    """Handle message read receipt"""
    db = get_db()
    message_id = data.get("message_id")
    
    if message_id:
        # Update message read status
        await db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$addToSet": {"read_by": user_id}}
        )
        
        # Notify sender
        message = await db.messages.find_one({"_id": ObjectId(message_id)})
        if message:
            await manager.send_personal(message["sender_id"], {
                "type": "read_receipt",
                "message_id": message_id,
                "read_by": user_id
            })


async def handle_call_offer(caller_id: str, caller_username: str, data: dict):
    """Handle WebRTC call offer"""
    db = get_db()
    callee_id = data.get("callee_id")
    room_id = data.get("room_id")
    sdp = data.get("sdp")
    call_type = data.get("call_type", "audio")
    
    # Use provided call_id or generate one
    call_id = data.get("call_id") or str(uuid.uuid4())
    call_manager.create_call(call_id, caller_id, callee_id, room_id, call_type)
    
    offer_message = create_offer_message(call_id, caller_id, caller_username, sdp, call_type)
    
    if callee_id:
        await manager.send_personal(callee_id, offer_message)
    elif room_id:
        await manager.broadcast_to_room(room_id, offer_message, exclude_user=caller_id)


async def handle_call_answer(answerer_id: str, data: dict):
    """Handle WebRTC call answer"""
    call_id = data.get("call_id")
    sdp = data.get("sdp")
    
    call_manager.join_call(call_id, answerer_id)
    
    call = call_manager.get_call(call_id)
    if call:
        answer_message = create_answer_message(call_id, answerer_id, sdp)
        
        # Send to caller or all participants
        if call.get("callee_id"):
            await manager.send_personal(call["caller_id"], answer_message)
        else:
            for participant in call["participants"]:
                if participant != answerer_id:
                    await manager.send_personal(participant, answer_message)


async def handle_ice_candidate(user_id: str, data: dict):
    """Handle WebRTC ICE candidate"""
    call_id = data.get("call_id")
    candidate = data.get("candidate")
    
    call = call_manager.get_call(call_id)
    if call:
        ice_message = create_ice_candidate_message(call_id, user_id, candidate)
        
        for participant in call["participants"]:
            if participant != user_id:
                await manager.send_personal(participant, ice_message)


async def handle_call_end(user_id: str, data: dict):
    """Handle call end"""
    call_id = data.get("call_id")
    
    call = call_manager.get_call(call_id)
    if call:
        end_message = create_call_ended_message(call_id, user_id)
        
        for participant in list(call["participants"]):
            if participant != user_id:
                await manager.send_personal(participant, end_message)
        
        call_manager.end_call(call_id)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": settings.APP_NAME}


# NexusChat Auto-Save endpoint
NEXUSCHAT_BASE = pathlib.Path("C:/NexusChat")

@app.post("/api/files/auto-save/{file_id}")
async def auto_save_file(file_id: str, file_type: str = "file"):
    """
    Auto-save a file to C:/NexusChat folders
    Creates the folder structure if it doesn't exist:
    - C:/NexusChat/Images/
    - C:/NexusChat/Videos/
    - C:/NexusChat/Files/
    """
    try:
        db = await get_db()
        from bson import ObjectId
        import gridfs
        
        # Determine folder based on file type
        if file_type == "image":
            folder = NEXUSCHAT_BASE / "Images"
        elif file_type == "video":
            folder = NEXUSCHAT_BASE / "Videos"
        else:
            folder = NEXUSCHAT_BASE / "Files"
        
        # Create folders if they don't exist
        folder.mkdir(parents=True, exist_ok=True)
        
        # Get file from GridFS
        fs = gridfs.GridFS(db)
        if len(file_id) == 24:
            file_obj = fs.get(ObjectId(file_id))
        else:
            # Try to find by filename
            file_obj = fs.find_one({"filename": file_id})
            if file_obj:
                file_obj = fs.get(file_obj._id)
        
        if not file_obj:
            return {"success": False, "error": "File not found"}
        
        # Get filename
        filename = file_obj.filename or f"file_{file_id}"
        
        # Check if file already exists
        target_path = folder / filename
        if target_path.exists():
            return {"success": True, "message": "File already exists", "path": str(target_path)}
        
        # Save the file
        with open(target_path, 'wb') as f:
            f.write(file_obj.read())
        
        return {"success": True, "message": "File saved", "path": str(target_path)}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/files/init-folders")
async def init_nexuschat_folders():
    """Initialize NexusChat folder structure"""
    try:
        (NEXUSCHAT_BASE / "Images").mkdir(parents=True, exist_ok=True)
        (NEXUSCHAT_BASE / "Videos").mkdir(parents=True, exist_ok=True)
        (NEXUSCHAT_BASE / "Files").mkdir(parents=True, exist_ok=True)
        return {
            "success": True, 
            "message": "Folders created", 
            "path": str(NEXUSCHAT_BASE),
            "folders": ["Images", "Videos", "Files"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
