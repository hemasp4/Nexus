import { useEffect, useRef, useState } from 'react';
import { useStatusStore } from '../../stores/statusStore';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import html2canvas from 'html2canvas';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import api from '../../api/config';

const API_URL = 'http://127.0.0.1:8000';

export function StatusViewer() {
  const {
    viewingUserStatuses, viewingUserId, viewingIndex,
    nextStatus, prevStatus, closeViewer, deleteStatus
  } = useStatusStore();
  const { setCurrentChat, setCurrentView } = useChatStore();
  const { user } = useAuthStore();

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStatus = viewingUserStatuses[viewingIndex];
  const isOwnStatus = viewingUserId === user?.id;
  const isVideoStatus = currentStatus?.media_type === 'video';

  // Auto-advance for image/text statuses (5 seconds)
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    if (currentStatus.media_type !== 'video') {
      setProgress(0);
      const duration = 5000;
      const interval = 50;
      let elapsed = 0;

      timerRef.current = setInterval(() => {
        elapsed += interval;
        setProgress((elapsed / duration) * 100);

        if (elapsed >= duration) {
          nextStatus();
        }
      }, interval);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [currentStatus, viewingIndex, isPaused, nextStatus]);

  // Handle keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') prevStatus();
      if (e.key === 'ArrowRight') nextStatus();
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      if (e.key === 'm') setIsMuted(m => !m);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeViewer, nextStatus, prevStatus]);

  // Update video volume/mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // Pause/play video sync
  useEffect(() => {
    if (videoRef.current && isVideoStatus) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPaused, isVideoStatus]);

  const togglePause = () => {
    setIsPaused(p => !p);
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(prog);
    }
  };

  const handleDeleteStatus = async () => {
    if (currentStatus && confirm('Delete this status?')) {
      await deleteStatus(currentStatus.id);
      if (viewingUserStatuses.length <= 1) {
        closeViewer();
      }
    }
  };

  // Screenshot function
  const handleScreenshot = async () => {
    if (!contentRef.current) return;

    try {
      setIsPaused(true);

      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#000',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `status-${currentStatus?.username}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setIsPaused(false);
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  // Send reply to status - sends message to chat
  const handleSendReply = async (content: string, type: 'text' | 'audio' | 'file' = 'text', file?: File) => {
    if (!currentStatus || !viewingUserId) return;

    try {
      let fileId = null;
      let fileName = null;
      let fileSize = null;

      // Upload file if present
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');
        const uploadRes = await fetch(`${API_URL}/api/files/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error('File upload failed');
        }
        const uploadData = await uploadRes.json();
        fileId = uploadData.file_id;
        fileName = file.name;
        fileSize = file.size;
      }

      // Send message as reply to status - use receiver_id (not recipient_id)
      const messageContent = type === 'text'
        ? `📤 Replied to your status: "${currentStatus.content?.slice(0, 30) || 'Media'}"\n\n${content}`
        : `📤 Replied to your status with ${type === 'audio' ? 'voice message' : 'a file'}`;

      await api.post('/api/messages/', {
        receiver_id: viewingUserId,
        content: messageContent,
        message_type: type === 'audio' ? 'voice' : type === 'file' ? 'file' : 'text',
        file_id: fileId,
        file_name: fileName,
        file_size: fileSize,
      });

      // Clear input and show feedback
      setReplyText('');
      setSelectedFile(null);
      setShowEmoji(false);
      setIsRecording(false);

      // Navigate to chat with this user
      closeViewer();
      setCurrentView('chats');
      setCurrentChat(viewingUserId, 'user');

    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

  // Handle text reply
  const handleTextReply = () => {
    if (replyText.trim()) {
      handleSendReply(replyText.trim(), 'text');
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleSendReply(file.name, 'file', file);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        handleSendReply('Voice message', 'audio', audioFile);
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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  if (!viewingUserId || !currentStatus) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#555', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
          </svg>
        </div>
        <p style={{ fontSize: '14px' }}>Click on a contact to view their status updates</p>
        <p style={{ fontSize: '12px', color: '#444', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '200px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Status updates are end-to-end encrypted
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: '3px', padding: '8px 16px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
        {viewingUserStatuses.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{
              width: i < viewingIndex ? '100%' : i === viewingIndex ? `${progress}%` : '0%',
              height: '100%',
              background: '#fff',
              transition: i === viewingIndex ? 'none' : 'width 0.3s',
              borderRadius: '1px'
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '24px 16px 12px',
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)'
      }}>
        <button onClick={closeViewer} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6l12 12" /></svg>
        </button>

        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', overflow: 'hidden', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
          {currentStatus.avatar ? (
            <img src={`${API_URL}/api/files/${currentStatus.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            currentStatus.username?.charAt(0)?.toUpperCase() || 'U'
          )}
        </div>

        <div style={{ flex: 1, marginLeft: '10px' }}>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{currentStatus.username}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{formatTime(currentStatus.created_at)}</div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Pause/Play button (replaces eye icon) */}
          <button onClick={togglePause} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }} title={isPaused ? 'Play' : 'Pause'}>
            {isPaused ? (
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            )}
          </button>

          {/* Volume controls - Only for video */}
          {isVideoStatus && (
            <>
              <button onClick={() => setIsMuted(!isMuted)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}>
                {isMuted ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', width: '80px', height: '36px', background: 'rgba(255,255,255,0.1)', borderRadius: '18px', padding: '0 12px' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (val > 0) setIsMuted(false);
                    else setIsMuted(true);
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    appearance: 'none',
                    background: `linear-gradient(to right, #fff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)`,
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </>
          )}

          {/* Screenshot button */}
          <button onClick={handleScreenshot} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }} title="Screenshot">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          {isOwnStatus && (
            <button onClick={handleDeleteStatus} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '50%', color: '#ef4444', cursor: 'pointer' }} title="Delete">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: '60px', paddingBottom: '80px' }} onClick={togglePause}>

        {/* Previous Button - Visible circular button on left */}
        {viewingIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prevStatus(); }}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              transition: 'all 0.2s ease',
              color: '#fff'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Next Button - Visible circular button on right */}
        {viewingIndex < viewingUserStatuses.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); nextStatus(); }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              transition: 'all 0.2s ease',
              color: '#fff'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {isPaused && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '16px' }}>
            <svg width="32" height="32" fill="#fff" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          </div>
        )}

        {currentStatus.media_id ? (
          currentStatus.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={`${API_URL}/api/files/${currentStatus.media_id}`}
              autoPlay
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={nextStatus}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
            />
          ) : (
            <img
              src={`${API_URL}/api/files/${currentStatus.media_id}`}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
            />
          )
        ) : (
          <div style={{ padding: '48px', background: currentStatus.background_color || '#6366f1', borderRadius: '16px', maxWidth: '80%', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', color: '#fff', lineHeight: 1.5, margin: 0 }}>{currentStatus.content}</p>
          </div>
        )}
      </div>

      {/* Reply Input */}
      {!isOwnStatus && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
          zIndex: 15
        }}>
          {/* Emoji Picker */}
          {showEmoji && (
            <div style={{ position: 'absolute', bottom: '70px', left: '16px', zIndex: 100 }}>
              <EmojiPicker
                onEmojiClick={(emoji) => setReplyText(prev => prev + emoji.emoji)}
                theme={Theme.DARK}
                width={300}
                height={400}
              />
            </div>
          )}

          {/* Recording UI */}
          {isRecording ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '24px',
              padding: '8px 16px',
              border: '1px solid rgba(239,68,68,0.3)'
            }}>
              <button onClick={cancelRecording} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#fff', fontSize: '14px' }}>{formatRecordingTime(recordingTime)}</span>
              </div>
              <button onClick={stopRecording} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6366f1', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '8px 16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,video/*,.pdf,.doc,.docx" />

              <button onClick={() => setShowEmoji(!showEmoji)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: showEmoji ? '#6366f1' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>

              <button onClick={() => fileInputRef.current?.click()} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              <input
                type="text"
                placeholder="Type a message"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextReply()}
                onFocus={() => setIsPaused(true)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              {replyText.trim() ? (
                <button onClick={handleTextReply} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6366f1', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              ) : (
                <button onClick={startRecording} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6366f1', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* View count footer - Only for own status */}
      {isOwnStatus && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
            </svg>
            {currentStatus.views || 0} views
          </div>
        </div>
      )}
    </div>
  );
}
