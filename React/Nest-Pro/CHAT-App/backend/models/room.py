from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    members: List[str] = []
    avatar: Optional[str] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None

class RoomResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    members: List[str] = []
    admins: List[str] = []
    created_by: str
    created_at: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

class RoomInDB(BaseModel):
    name: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    members: List[str] = []
    admins: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None

class RoomMember(BaseModel):
    user_id: str
    username: str
    avatar: Optional[str] = None
    role: str = "member"  # admin, member
    joined_at: datetime
