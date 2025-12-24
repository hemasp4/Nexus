# NexusChat - WhatsApp-Inspired Chat Application

A modern, feature-rich chat application with dark theme, real-time messaging, audio/video calling, and AI assistant.

## Features
- 🌙 Dark Theme with WhatsApp-inspired UI
- 💬 Real-time Messaging via WebSocket
- 📞 Audio/Video Calling (WebRTC)
- 👥 Group Chats & Calls
- 📁 File Sharing (All types)
- 🤖 Arise AI Assistant

## Tech Stack
- **Frontend**: HTML, CSS, TailwindCSS, JavaScript
- **Backend**: FastAPI, Python
- **Database**: MongoDB + GridFS
- **Real-time**: WebSocket, WebRTC

## Getting Started

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
Open `frontend/index.html` in browser or access via `http://localhost:8000`

## Project Structure
```
├── backend/          # FastAPI server
│   ├── main.py       # Entry point
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   └── models/       # Data models
└── frontend/         # Web client
    ├── index.html    # Login page
    ├── chat.html     # Chat interface
    ├── css/          # Styles
    └── js/           # Scripts
```
