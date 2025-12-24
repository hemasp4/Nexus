from typing import Dict, Set, Optional
from datetime import datetime
import json

class CallManager:
    """Manages WebRTC signaling for audio/video calls"""
    
    def __init__(self):
        # Active calls: call_id -> call info
        self.active_calls: Dict[str, dict] = {}
        # User to call mapping
        self.user_calls: Dict[str, str] = {}
        # Group calls: call_id -> set of participant user_ids
        self.group_calls: Dict[str, Set[str]] = {}
    
    def create_call(self, call_id: str, caller_id: str, callee_id: str = None, 
                   room_id: str = None, call_type: str = "audio") -> dict:
        """Create a new call"""
        call = {
            "call_id": call_id,
            "caller_id": caller_id,
            "callee_id": callee_id,
            "room_id": room_id,
            "call_type": call_type,  # audio, video
            "status": "ringing",  # ringing, active, ended
            "started_at": datetime.utcnow().isoformat(),
            "participants": {caller_id}
        }
        
        self.active_calls[call_id] = call
        self.user_calls[caller_id] = call_id
        
        if room_id:
            self.group_calls[call_id] = {caller_id}
        
        return call
    
    def join_call(self, call_id: str, user_id: str) -> Optional[dict]:
        """Join an existing call"""
        if call_id not in self.active_calls:
            return None
        
        call = self.active_calls[call_id]
        call["participants"].add(user_id)
        call["status"] = "active"
        
        self.user_calls[user_id] = call_id
        
        if call_id in self.group_calls:
            self.group_calls[call_id].add(user_id)
        
        return call
    
    def leave_call(self, call_id: str, user_id: str) -> Optional[dict]:
        """Leave a call"""
        if call_id not in self.active_calls:
            return None
        
        call = self.active_calls[call_id]
        call["participants"].discard(user_id)
        
        if user_id in self.user_calls:
            del self.user_calls[user_id]
        
        if call_id in self.group_calls:
            self.group_calls[call_id].discard(user_id)
        
        # End call if no participants
        if len(call["participants"]) == 0:
            return self.end_call(call_id)
        
        # End 1:1 call if one person leaves
        if not call.get("room_id") and len(call["participants"]) < 2:
            return self.end_call(call_id)
        
        return call
    
    def end_call(self, call_id: str) -> Optional[dict]:
        """End a call"""
        if call_id not in self.active_calls:
            return None
        
        call = self.active_calls[call_id]
        call["status"] = "ended"
        call["ended_at"] = datetime.utcnow().isoformat()
        
        # Clean up user mappings
        for user_id in list(call["participants"]):
            if user_id in self.user_calls:
                del self.user_calls[user_id]
        
        # Clean up group call
        if call_id in self.group_calls:
            del self.group_calls[call_id]
        
        # Remove from active calls
        del self.active_calls[call_id]
        
        return call
    
    def get_call(self, call_id: str) -> Optional[dict]:
        """Get call info"""
        return self.active_calls.get(call_id)
    
    def get_user_call(self, user_id: str) -> Optional[str]:
        """Get call ID for a user"""
        return self.user_calls.get(user_id)
    
    def get_call_participants(self, call_id: str) -> Set[str]:
        """Get participants in a call"""
        if call_id in self.active_calls:
            return self.active_calls[call_id]["participants"]
        return set()
    
    def is_user_in_call(self, user_id: str) -> bool:
        """Check if user is in a call"""
        return user_id in self.user_calls


# Global call manager instance
call_manager = CallManager()


# WebRTC signaling helpers
def create_offer_message(call_id: str, caller_id: str, caller_name: str, sdp: str, call_type: str) -> dict:
    """Create WebRTC offer message"""
    return {
        "type": "call_offer",
        "call_id": call_id,
        "caller_id": caller_id,
        "caller_name": caller_name,
        "sdp": sdp,
        "call_type": call_type,
        "timestamp": datetime.utcnow().isoformat()
    }


def create_answer_message(call_id: str, answerer_id: str, sdp: str) -> dict:
    """Create WebRTC answer message"""
    return {
        "type": "call_answer",
        "call_id": call_id,
        "answerer_id": answerer_id,
        "sdp": sdp,
        "timestamp": datetime.utcnow().isoformat()
    }


def create_ice_candidate_message(call_id: str, user_id: str, candidate: dict) -> dict:
    """Create ICE candidate message"""
    return {
        "type": "ice_candidate",
        "call_id": call_id,
        "user_id": user_id,
        "candidate": candidate,
        "timestamp": datetime.utcnow().isoformat()
    }


def create_call_ended_message(call_id: str, ended_by: str) -> dict:
    """Create call ended message"""
    return {
        "type": "call_ended",
        "call_id": call_id,
        "ended_by": ended_by,
        "timestamp": datetime.utcnow().isoformat()
    }
