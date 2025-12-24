from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
from config import settings
from utils.auth import get_current_user

router = APIRouter(prefix="/api/arise", tags=["Arise AI"])

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class AriseMessage(BaseModel):
    content: str
    context: Optional[str] = None
    conversation_history: Optional[List[dict]] = []

class AriseResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = []

# System prompt for Arise
ARISE_SYSTEM_PROMPT = """You are Arise, an intelligent AI assistant integrated into NexusChat. 
You help users with:
- Collaboration on ideas and projects
- Answering questions
- Brainstorming and creative thinking
- Technical assistance
- General conversation

Be friendly, helpful, and concise. Use emojis occasionally to be engaging.
When helping with collaboration, provide structured and actionable suggestions."""

@router.post("/chat", response_model=AriseResponse)
async def chat_with_arise(
    message: AriseMessage,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to Arise AI"""
    
    if not settings.GEMINI_API_KEY:
        # Fallback response if no API key
        return AriseResponse(
            response="Hi! I'm Arise, your AI assistant. 🤖 To enable my full capabilities, please configure the GEMINI_API_KEY in the backend settings. For now, I can provide basic responses!",
            suggestions=["Configure API key", "Learn more about Arise"]
        )
    
    try:
        # Build conversation
        model = genai.GenerativeModel('gemini-pro')
        
        # Build chat history
        history = []
        for msg in message.conversation_history or []:
            role = "user" if msg.get("role") == "user" else "model"
            history.append({"role": role, "parts": [msg.get("content", "")]})
        
        chat = model.start_chat(history=history)
        
        # Add context if provided
        prompt = message.content
        if message.context:
            prompt = f"Context: {message.context}\n\nUser: {message.content}"
        
        # Get response
        response = chat.send_message(f"{ARISE_SYSTEM_PROMPT}\n\n{prompt}")
        
        return AriseResponse(
            response=response.text,
            suggestions=[]
        )
        
    except Exception as e:
        return AriseResponse(
            response=f"I encountered an issue: {str(e)}. Let me try to help you anyway! What would you like to know?",
            suggestions=["Try again", "Ask a different question"]
        )

@router.post("/collaborate")
async def collaborate_mode(
    message: AriseMessage,
    current_user: dict = Depends(get_current_user)
):
    """Collaboration mode with Arise - provides structured suggestions"""
    
    collaboration_prompt = """You are in collaboration mode. Provide:
1. A clear analysis of the idea/problem
2. 3-5 actionable suggestions
3. Potential challenges to consider
4. Next steps

Format your response with clear sections using markdown."""
    
    if not settings.GEMINI_API_KEY:
        return AriseResponse(
            response="🤝 **Collaboration Mode**\n\nTo enable AI-powered collaboration, please configure the GEMINI_API_KEY.\n\n**Manual Collaboration Tips:**\n1. Break down your idea into smaller parts\n2. Identify key stakeholders\n3. Set clear milestones",
            suggestions=["Configure API", "View collaboration templates"]
        )
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"{ARISE_SYSTEM_PROMPT}\n\n{collaboration_prompt}\n\nTopic: {message.content}"
        if message.context:
            prompt += f"\n\nAdditional Context: {message.context}"
        
        response = model.generate_content(prompt)
        
        return AriseResponse(
            response=response.text,
            suggestions=["Expand on this", "Create action items", "Share with team"]
        )
        
    except Exception as e:
        return AriseResponse(
            response=f"Error in collaboration mode: {str(e)}",
            suggestions=["Try again"]
        )
