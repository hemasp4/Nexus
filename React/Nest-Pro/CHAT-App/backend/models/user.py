from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        schema.update(type="string")
        return schema

# Settings Model
class UserSettings(BaseModel):
    # Appearance
    theme: str = "dark"  # dark, light, system
    font_size: str = "medium"  # small, medium, large
    chat_wallpaper: Optional[str] = None  # file ID or preset name
    
    # Chat Settings
    enter_is_send: bool = True
    media_auto_download: str = "wifi"  # wifi, always, never
    
    # Notifications
    notification_messages: bool = True
    notification_groups: bool = True
    notification_calls: bool = True
    notification_sounds: bool = True
    
    # Privacy
    last_seen_visibility: str = "everyone"  # everyone, contacts, nobody
    profile_photo_visibility: str = "everyone"  # everyone, contacts, nobody
    about_visibility: str = "everyone"  # everyone, contacts, nobody
    read_receipts: bool = True

# Request Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None
    about: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    font_size: Optional[str] = None
    chat_wallpaper: Optional[str] = None
    enter_is_send: Optional[bool] = None
    media_auto_download: Optional[str] = None
    notification_messages: Optional[bool] = None
    notification_groups: Optional[bool] = None
    notification_calls: Optional[bool] = None
    notification_sounds: Optional[bool] = None
    last_seen_visibility: Optional[str] = None
    profile_photo_visibility: Optional[str] = None
    about_visibility: Optional[str] = None
    read_receipts: Optional[bool] = None

# Response Models
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    status: str = "online"
    about: str = "Hey there! I'm using NexusChat"
    contacts: List[str] = []
    created_at: datetime
    settings: Optional[UserSettings] = None
    
    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    id: str
    username: str
    avatar: Optional[str] = None
    status: str = "online"
    about: str = "Hey there! I'm using NexusChat"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Database Model
class UserInDB(BaseModel):
    username: str
    email: str
    password_hash: str
    avatar: Optional[str] = None
    status: str = "online"
    about: str = "Hey there! I'm using NexusChat"
    contacts: List[str] = []
    blocked: List[str] = []
    settings: UserSettings = Field(default_factory=UserSettings)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)

