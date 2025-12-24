import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App Settings
    APP_NAME: str = "NexusChat"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Server Settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "nexuschat")
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "nexuschat-super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # AI Settings (Arise)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: set = {"*"}  # All file types allowed
    
    # WebRTC STUN/TURN Servers
    ICE_SERVERS: list = [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
    ]

settings = Settings()
