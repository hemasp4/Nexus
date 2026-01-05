from typing import Dict, List, Set
from datetime import datetime
import json

class ConnectionManager:
    """Manages WebSocket connections for real-time messaging"""
    
    def __init__(self):
        # Map of user_id -> list of websocket connections
        self.active_connections: Dict[str, List] = {}
        # Map of room_id -> set of user_ids
        self.room_members: Dict[str, Set[str]] = {}
        # User status tracking
        self.user_status: Dict[str, str] = {}
        # Group call tracking: room_id -> {call_id, initiator, participants: set, call_type}
        self.active_group_calls: Dict[str, dict] = {}

    
    async def connect(self, websocket, user_id: str):
        """Accept and store new connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.user_status[user_id] = "online"
        
        # Broadcast user online status
        await self.broadcast_status(user_id, "online")
    
    async def disconnect(self, websocket, user_id: str):
        """Remove connection and update status"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # If no more connections, mark offline
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.user_status[user_id] = "offline"
                await self.broadcast_status(user_id, "offline")
    
    async def send_personal(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            message_json = json.dumps(message)
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message_json)
                except Exception:
                    pass
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Send message to all members of a room"""
        if room_id in self.room_members:
            for user_id in self.room_members[room_id]:
                if user_id != exclude_user:
                    await self.send_personal(user_id, message)
    
    async def broadcast_status(self, user_id: str, status: str):
        """Broadcast user status change to contacts"""
        message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # In real app, you'd get contacts from DB
        # For now, broadcast to all connected users
        for uid in self.active_connections:
            if uid != user_id:
                await self.send_personal(uid, message)
    
    def join_room(self, room_id: str, user_id: str):
        """Add user to a room"""
        if room_id not in self.room_members:
            self.room_members[room_id] = set()
        self.room_members[room_id].add(user_id)
    
    def leave_room(self, room_id: str, user_id: str):
        """Remove user from a room"""
        if room_id in self.room_members:
            self.room_members[room_id].discard(user_id)
    
    def is_online(self, user_id: str) -> bool:
        """Check if user is online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    def get_online_users(self) -> List[str]:
        """Get list of online user IDs"""
        return list(self.active_connections.keys())
    
    # Group Call Methods
    async def start_group_call(self, room_id: str, initiator_id: str, initiator_name: str, call_type: str, call_id: str):
        """Start a group call and notify all online room members"""
        import uuid
        if not call_id:
            call_id = str(uuid.uuid4())
        
        self.active_group_calls[room_id] = {
            "call_id": call_id,
            "initiator_id": initiator_id,
            "initiator_name": initiator_name,
            "call_type": call_type,
            "participants": {initiator_id},
            "started_at": datetime.utcnow().isoformat()
        }
        
        # Notify all online room members
        if room_id in self.room_members:
            for user_id in self.room_members[room_id]:
                if user_id != initiator_id and self.is_online(user_id):
                    await self.send_personal(user_id, {
                        "type": "group_call_incoming",
                        "room_id": room_id,
                        "call_id": call_id,
                        "initiator_id": initiator_id,
                        "initiator_name": initiator_name,
                        "call_type": call_type
                    })
        
        return call_id
    
    async def join_group_call(self, room_id: str, user_id: str, user_name: str):
        """User joins an active group call"""
        if room_id in self.active_group_calls:
            call = self.active_group_calls[room_id]
            call["participants"].add(user_id)
            
            # Notify all existing participants
            for participant_id in call["participants"]:
                if participant_id != user_id:
                    await self.send_personal(participant_id, {
                        "type": "group_call_participant_joined",
                        "room_id": room_id,
                        "call_id": call["call_id"],
                        "user_id": user_id,
                        "user_name": user_name,
                        "participants": list(call["participants"])
                    })
            
            return call
        return None
    
    async def leave_group_call(self, room_id: str, user_id: str):
        """User leaves a group call"""
        if room_id in self.active_group_calls:
            call = self.active_group_calls[room_id]
            call["participants"].discard(user_id)
            
            # If no participants left, end the call
            if len(call["participants"]) == 0:
                del self.active_group_calls[room_id]
                return None
            
            # Notify remaining participants
            for participant_id in call["participants"]:
                await self.send_personal(participant_id, {
                    "type": "group_call_participant_left",
                    "room_id": room_id,
                    "call_id": call["call_id"],
                    "user_id": user_id,
                    "participants": list(call["participants"])
                })
            
            return call
        return None
    
    def get_group_call(self, room_id: str):
        """Get active group call for a room"""
        return self.active_group_calls.get(room_id)


# Global connection manager instance
manager = ConnectionManager()
