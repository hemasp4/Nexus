from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
from config import settings
from utils.auth import get_current_user

router = APIRouter(prefix="/api/arise", tags=["Arise AI"])
gemini_model = 'gemini-2.5-flash' 
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
        model = genai.GenerativeModel(gemini_model)
        
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
        model = genai.GenerativeModel(gemini_model)
        
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

# ==========================================
# AI Conversation Storage (Database)
# ==========================================

from utils.db import get_db
from bson import ObjectId
from datetime import datetime

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"
    model: Optional[str] = gemini_model

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[dict]] = None

class MessageCreate(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all AI conversations for the current user"""
    try:
        conversations = await get_db().ai_conversations.find(
            {"user_id": current_user["user_id"]},
            {"messages": 0}  # Exclude messages for listing
        ).sort("updated_at", -1).to_list(100)
        
        result = []
        for conv in conversations:
            result.append({
                "id": str(conv["_id"]),
                "title": conv.get("title", "New Chat"),
                "model": conv.get("model", gemini_model),
                "created_at": conv.get("created_at").isoformat() if conv.get("created_at") else None,
                "updated_at": conv.get("updated_at").isoformat() if conv.get("updated_at") else None
            })
        
        return result
    except Exception as e:
        print(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations")
async def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new AI conversation"""
    try:
        now = datetime.utcnow()
        conversation = {
            "user_id": current_user["user_id"],
            "title": data.title,
            "model": data.model,
            "messages": [],
            "created_at": now,
            "updated_at": now
        }
        
        result = await get_db().ai_conversations.insert_one(conversation)
        
        # Return a clean response
        return {
            "id": str(result.inserted_id),
            "title": data.title,
            "model": data.model,
            "messages": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
    except Exception as e:
        print(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific AI conversation with all messages"""
    try:
        conversation = await get_db().ai_conversations.find_one({
            "_id": ObjectId(conv_id),
            "user_id": current_user["user_id"]
        })
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            "id": str(conversation["_id"]),
            "title": conversation.get("title", "New Chat"),
            "model": conversation.get("model", gemini_model),
            "messages": conversation.get("messages", []),
            "created_at": conversation.get("created_at").isoformat() if conversation.get("created_at") else None,
            "updated_at": conversation.get("updated_at").isoformat() if conversation.get("updated_at") else None
        }
    except Exception as e:
        print(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/conversations/{conv_id}")
async def update_conversation(
    conv_id: str,
    data: ConversationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a conversation (title or messages)"""
    try:
        update_data = {"updated_at": datetime.utcnow()}
        if data.title:
            update_data["title"] = data.title
        if data.messages is not None:
            update_data["messages"] = data.messages
        
        result = await get_db().ai_conversations.update_one(
            {"_id": ObjectId(conv_id), "user_id": current_user["user_id"]},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a conversation"""
    try:
        result = await get_db().ai_conversations.delete_one({
            "_id": ObjectId(conv_id),
            "user_id": current_user["user_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conv_id}/messages")
async def add_message(
    conv_id: str,
    data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a message to a conversation"""
    try:
        message = {
            "role": data.role,
            "content": data.content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        result = await get_db().ai_conversations.update_one(
            {"_id": ObjectId(conv_id), "user_id": current_user["user_id"]},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return message
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conv_id}/chat")
async def chat_in_conversation(
    conv_id: str,
    message: AriseMessage,
    current_user: dict = Depends(get_current_user)
):
    """Send a message and get AI response, storing both in the conversation"""
    try:
        # Get conversation
        conversation = await get_db().ai_conversations.find_one({
            "_id": ObjectId(conv_id),
            "user_id": current_user["user_id"]
        })
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Add user message
        user_msg = {
            "role": "user",
            "content": message.content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Get AI response
        ai_response_text = "I'm here to help!"
        
        if settings.GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel(conversation.get("model", gemini_model))
                history = []
                for msg in conversation.get("messages", [])[-10:]:
                    role = "user" if msg.get("role") == "user" else "model"
                    history.append({"role": role, "parts": [msg.get("content", "")]})
                
                chat = model.start_chat(history=history)
                response = chat.send_message(f"{ARISE_SYSTEM_PROMPT}\n\n{message.content}")
                ai_response_text = response.text
            except Exception as e:
                ai_response_text = f"I encountered an issue: {str(e)}"
        
        # Create AI message
        ai_msg = {
            "role": "assistant",
            "content": ai_response_text,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Update title if first message
        update_ops = {
            "$push": {"messages": {"$each": [user_msg, ai_msg]}},
            "$set": {"updated_at": datetime.utcnow()}
        }
        
        if len(conversation.get("messages", [])) == 0:
            update_ops["$set"]["title"] = message.content[:30] + ("..." if len(message.content) > 30 else "")
        
        await get_db().ai_conversations.update_one(
            {"_id": ObjectId(conv_id)},
            update_ops
        )
        
        return AriseResponse(
            response=ai_response_text,
            suggestions=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

