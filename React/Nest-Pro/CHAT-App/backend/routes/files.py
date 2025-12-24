from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from bson import ObjectId
from typing import Optional
import mimetypes

from utils.auth import get_current_user
from utils.db import get_db, get_fs

router = APIRouter(prefix="/api/files", tags=["Files"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to GridFS"""
    fs = get_fs()
    db = get_db()
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Detect content type
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    
    # Store in GridFS
    file_id = await fs.upload_from_stream(
        file.filename,
        content,
        metadata={
            "content_type": content_type,
            "uploaded_by": current_user["user_id"],
            "original_filename": file.filename,
            "size": file_size
        }
    )
    
    return {
        "file_id": str(file_id),
        "filename": file.filename,
        "size": file_size,
        "content_type": content_type
    }

@router.get("/{file_id}")
async def download_file(file_id: str):
    """Download/stream a file from GridFS"""
    fs = get_fs()
    
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get metadata
    metadata = grid_out.metadata or {}
    content_type = metadata.get("content_type", "application/octet-stream")
    filename = metadata.get("original_filename", "file")
    
    async def generate():
        while True:
            chunk = await grid_out.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )

@router.get("/{file_id}/info")
async def get_file_info(file_id: str, current_user: dict = Depends(get_current_user)):
    """Get file metadata"""
    fs = get_fs()
    
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    
    metadata = grid_out.metadata or {}
    
    return {
        "file_id": file_id,
        "filename": metadata.get("original_filename", "file"),
        "size": metadata.get("size", 0),
        "content_type": metadata.get("content_type", "application/octet-stream"),
        "uploaded_by": metadata.get("uploaded_by")
    }

@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a file from GridFS"""
    fs = get_fs()
    
    try:
        await fs.delete(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}
