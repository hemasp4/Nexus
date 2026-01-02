from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

class MessageCreate(BaseModel):
    receiver_id: Optional[str] = None
    room_id: Optional[str] = None
    content: str
    message_type: Literal["text", "image", "video", "audio", "file", "voice"] = "text"
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_username: str
    sender_avatar: Optional[str] = None
    receiver_id: Optional[str] = None
    room_id: Optional[str] = None
    content: str
    message_type: str = "text"
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    read_by: List[str] = []
    delivered_to: List[str] = []
    starred_by: List[str] = []
    timestamp: datetime
    edited: bool = False
    deleted: bool = False

class MessageInDB(BaseModel):
    sender_id: str
    receiver_id: Optional[str] = None
    room_id: Optional[str] = None
    content: str
    message_type: str = "text"
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    read_by: List[str] = []
    delivered_to: List[str] = []
    starred_by: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    edited: bool = False
    deleted: bool = False

class TypingIndicator(BaseModel):
    user_id: str
    username: str
    receiver_id: Optional[str] = None
    room_id: Optional[str] = None
    is_typing: bool = True
