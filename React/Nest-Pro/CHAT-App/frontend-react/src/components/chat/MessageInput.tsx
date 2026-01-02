import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/config';
import { EmojiPicker } from './EmojiPicker';

interface MessageInputProps {
    chatId: string;
    chatType: 'user' | 'room' | 'arise' | null;
}

export function MessageInput({ chatId, chatType }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordingCancelledRef = useRef<boolean>(false);
    const emojiRef = useRef<HTMLDivElement>(null);
    const attachRef = useRef<HTMLDivElement>(null);

    const { addMessage, replyingTo, setReplyingTo } = useChatStore();
    const { user } = useAuthStore();

    // Close emoji picker and attach menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmoji(false);
            }
            if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
                setShowAttachMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = async () => {
        if (!message.trim() && files.length === 0) return;

        try {
            if (files.length > 0) {
                setIsUploading(true);
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);

                    const uploadResponse = await api.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    const fileMessage = {
                        receiver_id: chatType === 'user' ? chatId : undefined,
                        room_id: chatType === 'room' ? chatId : undefined,
                        content: file.name,
                        message_type: file.type.startsWith('image/') ? 'image' :
                            file.type.startsWith('video/') ? 'video' : 'file',
                        file_id: uploadResponse.data.file_id,
                        file_name: uploadResponse.data.filename,
                        file_size: uploadResponse.data.size,
                        reply_to: replyingTo?.id,
                    };

                    const msgResponse = await api.post('/api/messages/', fileMessage);

                    if (msgResponse.data) {
                        addMessage(chatId, {
                            id: msgResponse.data.id || `msg-${Date.now()}`,
                            content: file.name,
                            sender_id: user?.id || '',
                            sender_username: user?.username,
                            receiver_id: chatType === 'user' ? chatId : undefined,
                            room_id: chatType === 'room' ? chatId : undefined,
                            message_type: fileMessage.message_type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice',
                            file_id: uploadResponse.data.file_id,
                            file_name: uploadResponse.data.filename,
                            file_size: uploadResponse.data.size,
                            reply_to: replyingTo?.id,
                            created_at: new Date().toISOString()
                        });
                    }
                }
                setFiles([]);
                setIsUploading(false);
            }

            if (message.trim()) {
                const newMessage = {
                    content: message,
                    receiver_id: chatType === 'user' ? chatId : undefined,
                    room_id: chatType === 'room' ? chatId : undefined,
                    message_type: 'text',
                    reply_to: replyingTo?.id,
                };

                const response = await api.post('/api/messages/', newMessage);

                if (response.data) {
                    addMessage(chatId, {
                        id: response.data.id || `msg-${Date.now()}`,
                        content: message,
                        sender_id: user?.id || '',
                        sender_username: user?.username,
                        receiver_id: chatType === 'user' ? chatId : undefined,
                        room_id: chatType === 'room' ? chatId : undefined,
                        message_type: 'text',
                        reply_to: replyingTo?.id,
                        created_at: new Date().toISOString()
                    });
                }

                setMessage('');
            }

            if (replyingTo) {
                setReplyingTo(null);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsUploading(false);
        }
    };

    // Voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingCancelledRef.current = false;

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                // Check if recording was cancelled
                if (recordingCancelledRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return; // Don't send the message
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                // Send voice message
                try {
                    setIsUploading(true);
                    const formData = new FormData();
                    formData.append('file', audioFile);

                    const uploadResponse = await api.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    const voiceMessage = {
                        receiver_id: chatType === 'user' ? chatId : undefined,
                        room_id: chatType === 'room' ? chatId : undefined,
                        content: 'Voice message',
                        message_type: 'voice',
                        file_id: uploadResponse.data.file_id,
                        file_name: audioFile.name,
                        file_size: audioFile.size,
                    };

                    const msgResponse = await api.post('/api/messages/', voiceMessage);

                    if (msgResponse.data) {
                        addMessage(chatId, {
                            id: msgResponse.data.id || `msg-${Date.now()}`,
                            content: 'Voice message',
                            sender_id: user?.id || '',
                            sender_username: user?.username,
                            receiver_id: chatType === 'user' ? chatId : undefined,
                            room_id: chatType === 'room' ? chatId : undefined,
                            message_type: 'voice',
                            file_id: uploadResponse.data.file_id,
                            file_name: audioFile.name,
                            file_size: audioFile.size,
                            created_at: new Date().toISOString()
                        });
                    }
                    setIsUploading(false);
                } catch (error) {
                    console.error('Failed to send voice message:', error);
                    setIsUploading(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            recordingCancelledRef.current = true; // Mark as cancelled
            mediaRecorderRef.current.stop(); // Stop properly to trigger cleanup
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsPaused(false);
            setRecordingTime(0);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        }
    };

    const togglePauseRecording = () => {
        if (isPaused) {
            resumeRecording();
        } else {
            pauseRecording();
        }
    };

    const formatRecordingTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/') || item.kind === 'file') {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    setFiles(prev => [...prev, file]);
                }
                return;
            }
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles) {
            setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
        }
        setShowAttachMenu(false);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    return (
        <footer className="message-input-container">
            {/* Reply Preview */}
            {replyingTo && (
                <div className="reply-preview-bar">
                    <div className="reply-preview-content">
                        <div className="reply-indicator"></div>
                        <div className="reply-info">
                            <span className="reply-to-name">{replyingTo.sender_username || 'User'}</span>
                            <span className="reply-to-text">
                                {replyingTo.message_type === 'text'
                                    ? replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : '')
                                    : `📎 ${replyingTo.file_name || 'File'}`
                                }
                            </span>
                        </div>
                    </div>
                    <button className="reply-cancel-btn" onClick={cancelReply}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* File Previews */}
            {files.length > 0 && (
                <div className="file-preview-bar">
                    {files.map((file, index) => (
                        <FilePreviewItem key={index} file={file} onRemove={() => removeFile(index)} />
                    ))}
                </div>
            )}

            {/* Recording UI - WhatsApp Style */}
            {isRecording ? (
                <div className="message-input-wrapper recording" style={{
                    background: 'linear-gradient(90deg, #1e1e2e 0%, #252536 100%)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    gap: '12px'
                }}>
                    {/* Trash/Cancel Button */}
                    <button
                        onClick={cancelRecording}
                        title="Cancel"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>

                    {/* Recording Indicator + Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            animation: 'pulse 1s infinite'
                        }} />
                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500, minWidth: '40px' }}>
                            {formatRecordingTime(recordingTime)}
                        </span>
                    </div>

                    {/* Waveform Visualization */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', height: '32px' }}>
                        {Array.from({ length: 25 }).map((_, i) => {
                            const animDelay = i * 0.05;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        width: '3px',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.4)',
                                        borderRadius: '2px',
                                        animation: `waveform 0.5s ease-in-out infinite alternate`,
                                        animationDelay: `${animDelay}s`,
                                        height: `${Math.random() * 70 + 30}%`
                                    }} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Pause/Resume Button */}
                    <button
                        onClick={togglePauseRecording}
                        title={isPaused ? "Resume" : "Pause"}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isPaused ? '#22c55e' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            color: '#fff'
                        }}
                    >
                        {isPaused ? (
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        )}
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={stopRecording}
                        title="Send"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            color: '#fff'
                        }}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>

                    <style>{`
                        @keyframes waveform {
                            from { height: 30%; }
                            to { height: 90%; }
                        }
                    `}</style>
                </div>
            ) : (
                <div className="message-input-wrapper">
                    {/* Emoji Button */}
                    <div ref={emojiRef} style={{ position: 'relative' }}>
                        <button
                            className={`input-action-btn ${showEmoji ? 'active' : ''}`}
                            title="Emoji"
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Custom WhatsApp-style Emoji Picker */}
                        <EmojiPicker
                            isOpen={showEmoji}
                            onClose={() => setShowEmoji(false)}
                            onEmojiSelect={(emoji) => {
                                setMessage(prev => prev + emoji);
                                textareaRef.current?.focus();
                            }}
                        />
                    </div>

                    {/* Attachment Button */}
                    <div className="attach-container" ref={attachRef}>
                        <button
                            className="input-action-btn"
                            title="Attach"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>

                        {/* Attachment Menu */}
                        {showAttachMenu && (
                            <div className="attach-menu">
                                <button className="attach-item" onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}>
                                    <div className="attach-icon photos">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span>Photos & Videos</span>
                                </button>
                                <button className="attach-item" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                                    <div className="attach-icon documents">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span>Document</span>
                                </button>
                            </div>
                        )}

                        {/* Hidden File Inputs */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            multiple
                        />
                        <input
                            ref={imageInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            multiple
                        />
                    </div>

                    {/* Message Input */}
                    <textarea
                        ref={textareaRef}
                        className="message-input"
                        placeholder="Type a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        rows={1}
                    />

                    {/* Send or Voice Button */}
                    {message.trim() || files.length > 0 ? (
                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={isUploading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    ) : (
                        <button className="voice-btn" title="Voice Message" onClick={startRecording}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </footer>
    );
}

function FilePreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
    const isImage = file.type.startsWith('image/');
    const [preview, setPreview] = useState<string>('');

    if (isImage && !preview) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    return (
        <div className="file-preview-item">
            {isImage && preview ? (
                <img src={preview} alt={file.name} />
            ) : (
                <div className="file-icon-preview">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
            )}
            <span className="file-name-preview">{file.name}</span>
            <button className="remove-file-btn" onClick={onRemove}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
