import { useState, useRef, useEffect } from 'react';
import type { JSX } from 'react';
import type { Message } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useStatusStore } from '../../stores/statusStore';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onImageClick: (fileId: string, fileName: string, message?: Message) => void;
  onVideoClick: (fileId: string, fileName: string, message?: Message) => void;
  isGroupChat?: boolean;
  allMessages?: Message[];
  onScrollToMessage?: (messageId: string) => void;
}

const API_URL = 'http://127.0.0.1:8000';

// URL regex for detecting links
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Helper function to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function MessageBubble({ message, onReply, onForward, onImageClick, onVideoClick, isGroupChat = false, allMessages = [], onScrollToMessage }: MessageBubbleProps) {
  const [showArrow, setShowArrow] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarred, setIsStarred] = useState(message.starred || false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmojiReactions, setShowEmojiReactions] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isFileDownloaded, setIsFileDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);
  const { user } = useAuthStore();
  const { deleteMessage, currentChatId, setCurrentView, starMessage, selectionMode, selectedMessages, toggleMessageSelection, toggleSelectionMode } = useChatStore();
  const { setViewingStatus, statuses } = useStatusStore();

  // Check if file/media is already downloaded (from localStorage)
  useEffect(() => {
    if (message.file_id) {
      const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');
      if (downloadedFiles[message.file_id]) {
        setIsFileDownloaded(true);
      }
    }
  }, [message.file_id]);

  // Check if message is pinned
  const [isPinned, setIsPinned] = useState(false);
  useEffect(() => {
    const checkPinned = () => {
      const pinnedMessages = JSON.parse(localStorage.getItem('pinnedMessages') || '{}');
      const pinData = pinnedMessages[message.id];
      if (pinData) {
        // Check if expired
        if (new Date(pinData.expiresAt) < new Date()) {
          // Remove expired pin
          delete pinnedMessages[message.id];
          localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
          setIsPinned(false);
        } else {
          setIsPinned(true);
        }
      } else {
        setIsPinned(false);
      }
    };
    checkPinned();
    // Re-check periodically
    const interval = setInterval(checkPinned, 10000);
    return () => clearInterval(interval);
  }, [message.id]);

  // Ref for emoji dropdown menu
  const emojiMenuRef = useRef<HTMLDivElement>(null);

  // Close emoji dropdown when clicking outside
  useEffect(() => {
    if (!showEmojiReactions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (emojiMenuRef.current && !emojiMenuRef.current.contains(event.target as Node)) {
        setShowEmojiReactions(false);
      }
    };

    // Add event listener with a small delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiReactions]);


  const isOwnMessage = user?.id === message.sender_id;
  const isDeleted = message.content === 'This message was deleted';

  // Check if this is a status reply - try multiple formats
  const isStatusReply = message.content?.includes('Replied to your status') || message.content?.includes('📤');
  const statusReplyMatch = message.content?.match(/📤 Replied to your status[^\"]*\"([^\"]+)\"/);
  const statusPreview = statusReplyMatch?.[1] || '';
  const actualMessage = message.content?.replace(/📤 Replied to your status[^\"]*\"[^\"]+\"\n\n?/, '').trim();

  // Find the matching status with file_id for thumbnail
  const findMatchingStatus = () => {
    const allStatuses = Object.values(statuses).flat();
    return allStatuses.find(s =>
      s.content?.includes(statusPreview) || statusPreview.includes(s.content?.slice(0, 20) || '')
    );
  };
  const matchingStatus = isStatusReply ? findMatchingStatus() : null;

  // Check for links in message
  const urls = message.content?.match(URL_REGEX) || [];
  const hasLinks = urls.length > 0 && message.message_type === 'text';

  // Download file and mark as downloaded (WhatsApp-style first phase)
  const handleDownload = async () => {
    if (!message.file_id) return;

    // Check if already downloaded (prevent duplicates)
    const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');
    if (downloadedFiles[message.file_id]) {
      setIsFileDownloaded(true);
      return;
    }

    try {
      setIsDownloading(true);

      // Check if auto-save is enabled
      const autoSaveEnabled = localStorage.getItem('autoSaveFiles') === 'true';

      if (autoSaveEnabled) {
        // Call backend API to save file to C:\NexusChat\Files
        const saveResponse = await fetch(`${API_URL}/api/files/auto-save/${message.file_id}?file_type=file`, {
          method: 'POST'
        });
        const result = await saveResponse.json();
        console.log('Auto-save result:', result);
      }

      // Fetch the file as blob (for Open/Save As functionality)
      const response = await fetch(`${API_URL}/api/files/${message.file_id}`);
      const blob = await response.blob();
      setDownloadedBlob(blob);

      // Mark file as downloaded in localStorage
      downloadedFiles[message.file_id] = {
        fileName: message.file_name,
        type: 'file',
        downloadedAt: new Date().toISOString(),
        autoSaved: autoSaveEnabled
      };
      localStorage.setItem('downloadedFiles', JSON.stringify(downloadedFiles));

      setIsFileDownloaded(true);
      setIsDownloading(false);
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
    }
  };

  // Open file in browser/app
  const handleOpenFile = () => {
    if (message.file_id) {
      window.open(`${API_URL}/api/files/${message.file_id}`, '_blank');
    }
  };

  // Save file to user's chosen location (File System Access API with fallback)
  const handleSaveAs = async () => {
    if (!message.file_id) return;

    try {
      // Fetch or use cached blob
      let blob = downloadedBlob;
      if (!blob) {
        const response = await fetch(`${API_URL}/api/files/${message.file_id}`);
        blob = await response.blob();
      }

      // Try File System Access API (Chrome/Edge) for "Save As" dialog
      if ('showSaveFilePicker' in window) {
        try {
          const fileExt = message.file_name?.split('.').pop() || '';
          const handle = await (window as typeof window & { showSaveFilePicker: (options: object) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: message.file_name || 'download',
            types: [{
              description: 'File',
              accept: { 'application/octet-stream': [`.${fileExt}`] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (e) {
          // User cancelled or API not supported, fall back to regular download
          console.log('Save As dialog cancelled or not supported, using fallback');
        }
      }

      // Fallback: regular browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Save As failed:', error);
    }
  };

  // Download media (image/video) and mark as downloaded - WhatsApp style
  const handleMediaDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.file_id) return;

    // Check if already downloaded (prevent duplicates)
    const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');
    if (downloadedFiles[message.file_id]) {
      // Already downloaded, just mark as downloaded
      setIsFileDownloaded(true);
      return;
    }

    try {
      setIsDownloading(true);

      // Check if auto-save is enabled
      const autoSaveEnabled = localStorage.getItem('autoSaveFiles') === 'true';

      if (autoSaveEnabled) {
        // Call backend API to save file to C:\NexusChat\Images or Videos
        const fileType = message.message_type === 'image' ? 'image' : 'video';
        const saveResponse = await fetch(`${API_URL}/api/files/auto-save/${message.file_id}?file_type=${fileType}`, {
          method: 'POST'
        });
        const result = await saveResponse.json();
        console.log('Auto-save result:', result);
      }

      // Mark as downloaded in localStorage
      downloadedFiles[message.file_id] = {
        fileName: message.file_name,
        type: message.message_type,
        downloadedAt: new Date().toISOString(),
        autoSaved: autoSaveEnabled
      };
      localStorage.setItem('downloadedFiles', JSON.stringify(downloadedFiles));

      setIsFileDownloaded(true);
      setIsDownloading(false);

      // DO NOT open preview after download - user just wants to download
    } catch (error) {
      console.error('Media download failed:', error);
      setIsDownloading(false);
    }
  };

  const handleDeleteForMe = async () => {
    if (currentChatId) {
      await deleteMessage(currentChatId, message.id, 'forMe');
      setShowMenu(false);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (currentChatId) {
      await deleteMessage(currentChatId, message.id, 'forEveryone');
      setShowMenu(false);
    }
  };

  const handleStar = async () => {
    if (currentChatId && starMessage) {
      await starMessage(currentChatId, message.id, !isStarred);
      setIsStarred(!isStarred);
      setShowMenu(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareData: ShareData = {
        title: 'Shared Message',
        text: message.content || '',
      };

      // Add file URL if it's a media message
      if (message.file_id) {
        shareData.url = `${API_URL}/api/files/${message.file_id}`;
      }

      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.text || shareData.url || '');
      }
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled or failed:', error);
    }
  };

  // Copy message content or media to clipboard
  const handleCopy = async () => {
    try {
      if (message.message_type === 'text') {
        // Copy text content
        await navigator.clipboard.writeText(message.content || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (message.file_id) {
        // For media/files, try to copy the actual file data
        try {
          const response = await fetch(`${API_URL}/api/files/${message.file_id}`);
          const blob = await response.blob();

          // Try to copy image to clipboard (works for images in Chromium browsers)
          if ((message.message_type === 'image' || blob.type.startsWith('image/')) && 'ClipboardItem' in window) {
            // Convert to PNG for better clipboard compatibility
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob(async (pngBlob) => {
                  if (pngBlob) {
                    try {
                      const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
                      await navigator.clipboard.write([clipboardItem]);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      // If clipboard fails, copy URL
                      await navigator.clipboard.writeText(`${API_URL}/api/files/${message.file_id}`);
                    }
                  }
                  resolve();
                }, 'image/png');
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(blob);
            });
          } else {
            // For other file types, copy the URL (users can paste to download)
            await navigator.clipboard.writeText(`${API_URL}/api/files/${message.file_id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch (clipboardError) {
          // Fallback: copy file URL
          await navigator.clipboard.writeText(`${API_URL}/api/files/${message.file_id}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Pin message
  const handlePin = () => {
    // TODO: Implement pin functionality via backend API
    console.log('Pin message:', message.id);
    // For now, store in localStorage as placeholder
    const pinnedMessages = JSON.parse(localStorage.getItem('pinnedMessages') || '{}');
    if (pinnedMessages[message.id]) {
      // Already pinned - unpin it
      delete pinnedMessages[message.id];
      localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
    } else {
      // Not pinned - show duration modal
      setShowPinModal(true);
    }
  };

  // Pin with duration
  const handlePinWithDuration = (duration: 'custom' | '24h' | '7d' | '30d', customMinutes?: number) => {
    const pinnedMessages = JSON.parse(localStorage.getItem('pinnedMessages') || '{}');

    let expiresAt: Date;
    const now = new Date();

    if (duration === 'custom' && customMinutes) {
      expiresAt = new Date(now.getTime() + customMinutes * 60 * 1000);
    } else if (duration === '24h') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (duration === '7d') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else { // 30d
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    pinnedMessages[message.id] = {
      chatId: currentChatId,
      pinnedAt: now.toISOString(),
      pinnedBy: user?.id,
      pinnedByName: user?.username,
      expiresAt: expiresAt.toISOString(),
      duration: duration,
      messageContent: message.content || message.file_name || 'Media',
      messageType: message.message_type
    };

    localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
    setShowPinModal(false);
  };

  // Navigate to status when clicking status reply
  const handleStatusClick = () => {
    // Find the status being replied to
    const allStatuses = Object.values(statuses).flat();
    const matchingStatus = allStatuses.find(s =>
      s.content?.includes(statusPreview) || statusPreview.includes(s.content?.slice(0, 20) || '')
    );
    if (matchingStatus) {
      setViewingStatus(matchingStatus.user_id, 0);
      setCurrentView('status');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Deleted message with unique icon - show delete button to remove placeholder
  if (isDeleted) {
    return (
      <div
        style={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', marginBottom: '4px', padding: '4px 60px' }}
        onMouseEnter={() => setShowArrow(true)}
        onMouseLeave={() => setShowArrow(false)}
      >
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: isOwnMessage ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <svg width="14" height="14" fill="none" stroke="#666" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            <span style={{ fontStyle: 'italic', color: '#666', fontSize: '13px' }}>This message was deleted</span>
            <span style={{ fontSize: '11px', color: '#555' }}>{formatTime(message.created_at)}</span>
          </div>
          {/* Remove button to completely delete the placeholder */}
          {showArrow && (
            <button
              onClick={handleDeleteForMe}
              title="Remove from chat"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Voice message player
    if (message.message_type === 'voice' && message.file_id) {
      return <VoiceMessagePlayer fileId={message.file_id} isOwn={isOwnMessage} />;
    }

    switch (message.message_type) {
      case 'image':
        return (
          <div style={{ position: 'relative' }}>
            <img
              src={`${API_URL}/api/files/${message.file_id}`}
              alt=""
              style={{
                maxWidth: '280px',
                maxHeight: '280px',
                borderRadius: '10px',
                cursor: isFileDownloaded ? 'pointer' : 'default',
                display: 'block',
                filter: !isFileDownloaded ? 'brightness(0.6)' : 'none'
              }}
              onClick={() => isFileDownloaded && message.file_id && onImageClick(message.file_id, message.file_name || 'image', message)}
              loading="lazy"
            />
            {/* Download icon overlay - WhatsApp style (only show when NOT downloaded) */}
            {!isFileDownloaded && (
              <div
                onClick={handleMediaDownload}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }}>
                  {isDownloading ? (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                </div>
                {/* File size */}
                <span style={{
                  fontSize: '11px',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backdropFilter: 'blur(4px)'
                }}>
                  {formatFileSize(message.file_size)}
                </span>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div
            style={{ position: 'relative', cursor: isFileDownloaded ? 'pointer' : 'default' }}
            onClick={() => isFileDownloaded && message.file_id && onVideoClick(message.file_id, message.file_name || 'video', message)}
          >
            <video
              src={`${API_URL}/api/files/${message.file_id}`}
              style={{
                maxWidth: '280px',
                maxHeight: '280px',
                borderRadius: '10px',
                display: 'block',
                filter: !isFileDownloaded ? 'brightness(0.6)' : 'none'
              }}
              muted
            />
            {/* Show play button only when downloaded, download button when not */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', gap: '8px' }}>
              {isFileDownloaded ? (
                // Play button (when downloaded)
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)', borderRadius: '50%' }}>
                  <svg width="24" height="24" fill="#000" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              ) : (
                // Download button with file size (when not downloaded)
                <>
                  <div
                    onClick={handleMediaDownload}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {isDownloading ? (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </div>
                  {/* File size */}
                  <span style={{
                    fontSize: '11px',
                    color: '#fff',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    {formatFileSize(message.file_size)}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      case 'file':
      case 'audio':
        const fileExt = message.file_name?.split('.').pop()?.toUpperCase() || 'FILE';

        // Get file type PNG icon
        const getFileTypeIcon = () => {
          const ext = message.file_name?.split('.').pop()?.toLowerCase() || '';
          const iconMap: Record<string, string> = {
            pdf: '/src/assets/icons/pdf.png',
            doc: '/src/assets/icons/doc.png',
            docx: '/src/assets/icons/doc.png',
            xls: '/src/assets/icons/xls.png',
            xlsx: '/src/assets/icons/xls.png',
            csv: '/src/assets/icons/csv-file.png',
            xml: '/src/assets/icons/xml.png',
            jpg: '/src/assets/icons/image-.png',
            jpeg: '/src/assets/icons/image-.png',
            png: '/src/assets/icons/image-.png',
            gif: '/src/assets/icons/image-.png',
            mp4: '/src/assets/icons/video-lesson.png',
            mov: '/src/assets/icons/video-lesson.png',
            avi: '/src/assets/icons/video-lesson.png',
          };
          const iconPath = iconMap[ext] || '/src/assets/icons/doc.png';
          return <img src={iconPath} alt={ext} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
        };

        return (
          <div style={{ minWidth: '200px' }}>
            {/* File Info Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
              {/* File Type Icon */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getFileTypeIcon()}
              </div>

              {/* File Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {message.file_name || 'File'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  {formatFileSize(message.file_size)}
                </div>
              </div>
            </div>

            {/* WhatsApp-style: Download first, then Open + Save As */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 10px 10px' }}>
              {!isFileDownloaded ? (
                // Phase 1: Download button (like WhatsApp)
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  disabled={isDownloading}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: isDownloading ? 'rgba(37, 211, 102, 0.3)' : 'rgba(37, 211, 102, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isDownloading ? 'wait' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isDownloading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              ) : (
                // Phase 2: Open + Save As (like WhatsApp after download)
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenFile(); }}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      background: 'rgba(78, 81, 78, 0.2)',
                      border: '1px solid rgba(73, 75, 73, 0.4)',
                      borderRadius: '8px',
                      color: '#ffffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveAs(); }}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      background: 'rgba(78, 81, 78, 0.2)',
                      border: '1px solid rgba(73, 75, 73, 0.4)',
                      borderRadius: '8px',
                      color: '#ffffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save as...
                  </button>
                </>
              )}
            </div>
          </div>
        );
      default:
        // Text message - check for links and status reply
        return (
          <div>
            {/* Status Reply Preview */}
            {isStatusReply && statusPreview && (
              <div
                onClick={handleStatusClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.2) 100%)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  borderLeft: '3px solid #22c55e'
                }}
              >
                {/* Status Thumbnail */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {matchingStatus?.media_id ? (
                    matchingStatus.media_type === 'video' ? (
                      <video
                        src={`${API_URL}/api/files/${matchingStatus.media_id}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                    ) : (
                      <img
                        src={`${API_URL}/api/files/${matchingStatus.media_id}`}
                        alt="Status"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )
                  ) : (
                    <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, marginBottom: '2px' }}>
                    {message.sender_username}'s Status
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {matchingStatus?.media_type === 'video' ? '🎬' : matchingStatus?.media_type === 'image' ? '📷' : '📝'} {statusPreview}
                  </div>
                </div>
                {/* Reply indicator arrow */}
                <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            )}

            {/* Actual message or remainder after status reply */}
            {(() => {
              const content = isStatusReply ? actualMessage : message.content;
              const maxLength = 500;
              const isLongMessage = content && content.length > maxLength;
              const displayContent = isLongMessage && !isExpanded
                ? content.slice(0, maxLength) + '...'
                : content;

              return (
                <div style={{ fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {isStatusReply ? displayContent : renderTextWithLinks(displayContent || '')}
                  {isLongMessage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '4px 0',
                        marginLeft: '4px'
                      }}
                    >
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Link Preview */}
            {hasLinks && urls[0] && (
              <LinkPreview url={urls[0]} />
            )}
          </div>
        );
    }
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', marginBottom: '4px', padding: '2px 60px', gap: '6px' }}
      onMouseEnter={() => setShowArrow(true)}
      onMouseLeave={() => { setShowArrow(false); setShowMenu(false); setShowEmojiReactions(false); }}
    >
      {/* Selection Checkbox - shown when in selection mode */}
      {selectionMode && (
        <button
          onClick={() => toggleMessageSelection(message.id)}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            border: selectedMessages.has(message.id) ? 'none' : '2px solid rgba(255,255,255,0.4)',
            background: selectedMessages.has(message.id) ? '#22c55e' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            marginRight: '4px',
            transition: 'all 0.15s',
          }}
        >
          {selectedMessages.has(message.id) && (
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </button>
      )}
      {/* Emoji Reaction Button - left side for own messages */}
      {isOwnMessage && showArrow && !isDeleted && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiReactions(!showEmojiReactions);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '20%',
              background: showEmojiReactions
                ? 'rgba(0,0,0,0.2)'
                : 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              marginRight: '8px',

            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                transform: 'translateY(1px)',
                padding: '4px',
                borderRadius: '25px',
                border: '1px solid gray',
                opacity: '0.7'
                // WhatsApp-like vertical alignment
              }}
            >
              {/* Emoji icon */}
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                style={{ opacity: 0.85 }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>

              {/* Dropdown arrow */}
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ opacity: 0.7 }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </button>



          {/* WhatsApp-style Full Action Menu with Emoji Bar */}
          {showEmojiReactions && (
            <>
              {/* Click-outside overlay */}
              <div
                onClick={() => setShowEmojiReactions(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999,
                  background: 'transparent'
                }}
              />
              <div
                ref={emojiMenuRef}
                style={{

                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  background: '#233138',
                  borderRadius: '8px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  marginBottom: '8px',
                  zIndex: 1000,
                  minWidth: '170px',
                  overflow: 'hidden',
                  marginRight: '10px',
                }}>
                {/* Menu Items - WhatsApp style, no emoji bar */}
                <div style={{ padding: '4px 0' }}>
                  <ReactionMenuItem icon="↩" label="Reply" onClick={() => { onReply(message); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon="📋" label="Copy" onClick={() => { handleCopy(); setShowEmojiReactions(false); }} />
                  {/* Save as - only show for media/files, not text messages */}
                  {message.message_type !== 'text' && (
                    <ReactionMenuItem icon="💾" label="Save as..." onClick={() => { handleSaveAs(); setShowEmojiReactions(false); }} />
                  )}
                  <ReactionMenuItem icon="↪" label="Forward" onClick={() => { onForward(message); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon={isStarred ? "⭐" : "☆"} label="Star" onClick={() => { handleStar(); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon="📌" label="Pin" onClick={() => { handlePin(); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon="🗑" label="Delete" onClick={() => { setShowDeleteModal(true); setShowEmojiReactions(false); }} />
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  <ReactionMenuItem icon="☑️" label="Select" onClick={() => { toggleSelectionMode(true); toggleMessageSelection(message.id); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon="📤" label="Share" onClick={() => { handleShare(); setShowEmojiReactions(false); }} />
                  <ReactionMenuItem icon="ℹ️" label="Info" onClick={() => { setShowMessageInfo(true); setShowEmojiReactions(false); }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ position: 'relative', maxWidth: '65%' }}>
        {/* Sender name - only show in group chats */}
        {isGroupChat && !isOwnMessage && message.sender_username && (
          <div style={{ fontSize: '11px', color: '#6366f1', marginBottom: '2px', fontWeight: 500, paddingLeft: '12px' }}>{message.sender_username}</div>
        )}

        {/* Message bubble */}
        <div style={{
          background: isOwnMessage ? '#6366f1' : '#1e1e2e',
          borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: message.message_type === 'text' || message.message_type === 'voice' ? '8px 12px' : '4px',
          color: '#fff',
          position: 'relative',
        }}>

          {/* WhatsApp-style Reply Card - shown when replying to another message */}
          {message.reply_to && (() => {
            const replyToMessage = allMessages.find(m => m.id === message.reply_to);
            if (!replyToMessage) return null;

            const isReplyToImage = replyToMessage.message_type === 'image';
            const isReplyToVideo = replyToMessage.message_type === 'video';
            const isReplyToFile = replyToMessage.message_type === 'file' || replyToMessage.message_type === 'audio';
            const hasMediaThumbnail = isReplyToImage || isReplyToVideo;

            // Sender color for the left border - different for own vs other's message
            const borderColor = replyToMessage.sender_id === user?.id ? '#6366f1' : '#22c55e';

            return (
              <div
                onClick={() => onScrollToMessage?.(message.reply_to!)}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  background: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderLeft: `4px solid ${borderColor}`,
                }}
              >
                {/* Reply content */}
                <div style={{ flex: 1, padding: '6px 8px', minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: borderColor,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {replyToMessage.sender_id === user?.id ? 'You' : (replyToMessage.sender_username || 'User')}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {isReplyToImage && <span>📷</span>}
                    {isReplyToVideo && <span>🎬</span>}
                    {isReplyToFile && <span>📎</span>}
                    {replyToMessage.message_type === 'voice' && <span>🎤</span>}
                    <span>
                      {replyToMessage.message_type === 'text'
                        ? replyToMessage.content?.substring(0, 60) + (replyToMessage.content && replyToMessage.content.length > 60 ? '...' : '')
                        : (isReplyToImage ? 'Photo' : isReplyToVideo ? 'Video' : replyToMessage.file_name || 'File')
                      }
                    </span>
                  </div>
                </div>

                {/* Thumbnail for images/videos */}
                {hasMediaThumbnail && replyToMessage.file_id && (
                  <div style={{
                    width: '52px',
                    height: '52px',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}>
                    {isReplyToImage ? (
                      <img
                        src={`${API_URL}/api/files/${replyToMessage.file_id}`}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <video
                        src={`${API_URL}/api/files/${replyToMessage.file_id}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {renderContent()}

          {/* Time, pin, star & read status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '2px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            {isPinned && (
              <span title="Pinned message" style={{ color: '#6366f1' }}>📌</span>
            )}
            {isStarred && (
              <svg width="10" height="10" fill="#fbbf24" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <span>{formatTime(message.created_at)}</span>
            {isOwnMessage && (
              <span style={{ marginLeft: '2px' }}>
                {/* WhatsApp-style ticks: single (sent), double grey (delivered), double green (read) */}
                {message.read_by && message.read_by.length > 0 ? (
                  // Double green tick - read
                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                    <path d="M11.5 0.5L5.5 7.5L2.5 4.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14.5 0.5L8.5 7.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : message.delivered_to && message.delivered_to.length > 0 ? (
                  // Double grey tick - delivered
                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                    <path d="M11.5 0.5L5.5 7.5L2.5 4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14.5 0.5L8.5 7.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  // Single grey tick - sent
                  <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
                    <path d="M10.5 0.5L4.5 7.5L1.5 4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>

        {/* WhatsApp-style vertical action menu */}
        {showMenu && (
          <div style={{
            position: 'absolute',
            top: '0',
            [isOwnMessage ? 'left' : 'right']: '-8px',
            transform: isOwnMessage ? 'translateX(-100%)' : 'translateX(100%)',
            background: '#2d2d3a',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            minWidth: '180px',
            zIndex: 100,

          }}>
            {/* Reply */}
            <MenuButton icon="↩" label="Reply" onClick={() => { onReply(message); setShowMenu(false); }} />

            {/* Copy */}
            <MenuButton icon="📋" label={copied ? 'Copied!' : 'Copy'} onClick={() => { handleCopy(); setShowMenu(false); }} />

            {/* Forward */}
            <MenuButton icon="↪" label="Forward" onClick={() => { onForward(message); setShowMenu(false); }} />

            {/* Star */}
            <MenuButton icon={isStarred ? '⭐' : '☆'} label={isStarred ? 'Unstar' : 'Star'} onClick={handleStar} />

            {/* Download (only for files) */}
            {message.file_id && (
              <MenuButton icon="⬇" label="Download" onClick={() => { handleDownload(); setShowMenu(false); }} />
            )}

            {/* Delete - opens confirmation modal */}
            <MenuButton icon="🗑" label="Delete" onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} danger />
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          isOwnMessage={isOwnMessage}
          messagePreview={message.content}
        />
      </div>

      {/* Emoji Reaction Button - right side for received messages */}
      {!isOwnMessage && showArrow && !isDeleted && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiReactions(!showEmojiReactions);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: showEmojiReactions
                ? 'rgba(0,0,0,0.2)'
                : 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              marginLeft: '8px',
            }}
          >
            <div
              style={{
                border: '1px solid gray',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                transform: 'translateY(1px)',
                padding: '4px',

                borderRadius: '25px',
                opacity: 0.7, // WhatsApp-like vertical alignment
              }}
            >


              {/* Dropdown arrow */}
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ opacity: 0.7 }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              {/* Emoji icon */}
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                style={{ opacity: 0.85 }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
          </button>


          {/* WhatsApp-style Action Menu - no emoji bar */}
          {showEmojiReactions && (

            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              background: '#233138',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              marginBottom: '8px',
              zIndex: 1000,
              minWidth: '170px',
              overflow: 'hidden',
              marginLeft: '10px',
            }}>
              {/* Menu Items */}
              <div style={{ padding: '4px 0' }}>
                <ReactionMenuItem icon="↩" label="Reply" onClick={() => { onReply(message); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="📋" label="Copy" onClick={() => { handleCopy(); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="💾" label="Save as..." onClick={() => { handleDownload(); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="↪" label="Forward" onClick={() => { onForward(message); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon={isStarred ? "⭐" : "☆"} label="Star" onClick={() => { handleStar(); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="📌" label="Pin" onClick={() => { handlePin(); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="🗑" label="Delete" onClick={() => { setShowDeleteModal(true); setShowEmojiReactions(false); }} />
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <ReactionMenuItem icon="☑️" label="Select" onClick={() => { toggleSelectionMode(true); toggleMessageSelection(message.id); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="📤" label="Share" onClick={() => { handleShare(); setShowEmojiReactions(false); }} />
                <ReactionMenuItem icon="ℹ️" label="Info" onClick={() => { setShowMessageInfo(true); setShowEmojiReactions(false); }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message Info Popup */}
      {showMessageInfo && (
        <MessageInfoPopup
          message={message}
          isOwnMessage={isOwnMessage}
          onClose={() => setShowMessageInfo(false)}
        />
      )}

      {/* Pin Duration Modal */}
      {showPinModal && (
        <PinDurationModal
          onClose={() => setShowPinModal(false)}
          onPin={handlePinWithDuration}
        />
      )}
    </div>
  );
}

// Render text with clickable links
function renderTextWithLinks(text: string) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);

  return parts.map((part, i) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#93c5fd', textDecoration: 'underline' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Link Preview Component
function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<{ title: string; description: string; domain: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract domain from URL
    try {
      const domain = new URL(url).hostname;
      // Generate a simple preview based on URL
      let title = 'Link';
      let description = url;

      if (url.includes('chatgpt.com')) {
        title = 'ChatGPT';
        description = 'Shared via ChatGPT';
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        title = 'YouTube Video';
        description = 'Watch on YouTube';
      } else if (url.includes('github.com')) {
        title = 'GitHub';
        description = 'View on GitHub';
      } else if (url.includes('twitter.com') || url.includes('x.com')) {
        title = 'Twitter/X Post';
        description = 'View on X';
      } else if (url.includes('instagram.com')) {
        title = 'Instagram';
        description = 'View on Instagram';
      }

      setPreview({ title, description, domain });
    } catch {
      setPreview(null);
    }
    setLoading(false);
  }, [url]);

  if (loading || !preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        marginTop: '8px',
        textDecoration: 'none',
        color: 'inherit',
        borderLeft: '3px solid #6366f1'
      }}
    >
      {/* Favicon/Icon */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        background: '#6366f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '12px',
        fontWeight: 600
      }}>
        {preview.title.slice(0, 2).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview.title}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview.description}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          {preview.domain}
        </div>
      </div>
    </a>
  );
}

// WhatsApp-style Voice Message Player
function VoiceMessagePlayer({ fileId, isOwn, fileSize }: { fileId: string; isOwn: boolean; fileSize?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check download status
  useEffect(() => {
    const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');
    if (downloadedFiles[fileId]) {
      setIsDownloaded(true);
    }
  }, [fileId]);

  // Handle download
  const handleVoiceDownload = async () => {
    setIsDownloading(true);
    try {
      // Check auto-save
      const autoSaveEnabled = localStorage.getItem('autoSaveFiles') === 'true';
      if (autoSaveEnabled) {
        await fetch(`${API_URL}/api/files/auto-save/${fileId}?file_type=file`, { method: 'POST' });
      }

      // Mark as downloaded
      const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');
      downloadedFiles[fileId] = { type: 'voice', downloadedAt: new Date().toISOString() };
      localStorage.setItem('downloadedFiles', JSON.stringify(downloadedFiles));

      setIsDownloaded(true);
    } catch (e) {
      console.error('Voice download failed:', e);
    }
    setIsDownloading(false);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: '250px',
      padding: '4px 0'
    }}>
      <audio ref={audioRef} src={`${API_URL}/api/files/${fileId}`} preload="metadata" />

      {/* Speed Button (shown when playing) */}
      {isPlaying && (
        <button
          onClick={toggleSpeed}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {playbackRate}x
        </button>
      )}

      {/* Avatar/Mic icon (shown when not playing) */}
      {!isPlaying && (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: isOwn ? 'rgba(255,255,255,0.2)' : '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative'
        }}>
          <svg width="20" height="20" fill={isOwn ? '#fff' : '#fff'} viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
          {/* Download indicator (receiver only) or green mic indicator (sender or after download) */}
          {!isOwn && !isDownloaded ? (
            // Download button (only for receiver when not downloaded)
            <div
              onClick={handleVoiceDownload}
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid #1e1e2e'
              }}
            >
              {isDownloading ? (
                <div style={{
                  width: '10px',
                  height: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </div>
          ) : (
            // Green microphone indicator (for sender, or receiver after download)
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="8" height="8" fill="#fff" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Play/Pause or Download Button */}
      {/* Sender (isOwn): Can play immediately, no download needed */}
      {/* Receiver (!isOwn): Must download first, then play */}
      <button
        onClick={isOwn ? togglePlay : (isDownloaded ? togglePlay : handleVoiceDownload)}
        disabled={isLoading || (!isOwn && isDownloading)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: (!isOwn && !isDownloaded) ? 'rgba(37, 211, 102, 0.9)' : 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {!isOwn && isDownloading ? (
          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        ) : !isOwn && !isDownloaded ? (
          // Download icon (only for receiver)
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ) : isLoading ? (
          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        ) : isPlaying ? (
          <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform / Progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Waveform visualization */}
        <div style={{ height: '24px', display: 'flex', alignItems: 'center', gap: '1px', position: 'relative' }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const height = Math.sin(i * 0.5) * 10 + 12 + Math.random() * 4;
            const isPlayed = duration > 0 && (i / 30) * 100 <= progress;
            return (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${height}px`,
                  borderRadius: '2px',
                  background: isPlayed ? '#22c55e' : 'rgba(255,255,255,0.3)',
                  transition: 'background 0.1s'
                }}
              />
            );
          })}
          {/* Seek dot */}
          <div style={{
            position: 'absolute',
            left: `${progress}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#22c55e'
          }} />
        </div>

        {/* Hidden range input for seeking */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          style={{
            position: 'absolute',
            width: '100%',
            height: '24px',
            opacity: 0,
            cursor: 'pointer'
          }}
        />

        {/* Duration */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
          {formatDuration(isPlaying ? currentTime : duration || 0)}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Action button component with PNG icons
function ActionButton({ icon, title, onClick, danger = false }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);

  // Map icon names to PNG paths
  const iconPaths: Record<string, string> = {
    copy: '/src/assets/icons/copy.png',
    download: '/src/assets/icons/download.png',
    delete: '/src/assets/icons/delete.png',
    star: '/src/assets/icons/star.png',
    unstar: '/src/assets/icons/unstar.png',
    share: '/src/assets/icons/share.png',
    check: '/src/assets/icons/check.png',
  };

  // Fallback SVG icons for ones not in PNG
  const svgIcons: Record<string, JSX.Element> = {
    undo: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
    redo: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>,
    reply: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 15 3 9l6-6" /><path d="M3 9h12a6 6 0 0 1 6 6v3" /></svg>,
    forward: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 15 6-6-6-6" /><path d="M21 9H9a6 6 0 0 0-6 6v3" /></svg>,
  };

  const hasPngIcon = iconPaths[icon];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: '26px',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hover ? (danger ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)') : 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: hover ? (danger ? '#ef4444' : '#6366f1') : '#888',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {hasPngIcon ? (
        <img
          src={iconPaths[icon]}
          alt={icon}
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain',
            filter: danger ? 'hue-rotate(300deg) saturate(2)' : 'none',
            opacity: hover ? 1 : 0.7
          }}
        />
      ) : (
        svgIcons[icon]
      )}
    </button>
  );
}

// Menu button for WhatsApp-style vertical dropdown
function MenuButton({ icon, label, onClick, danger = false }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none',
        color: danger ? '#ef4444' : '#fff',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Reaction menu item for WhatsApp-style dropdown with PNG icons
function ReactionMenuItem({ icon, label, onClick, danger = false }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);

  // Map icon names/emojis to PNG paths
  const iconPaths: Record<string, string> = {
    '↩': '/src/assets/icons/reply.png', // Reply - using copy as placeholder
    'reply': '/src/assets/icons/reply.png',
    '📋': '/src/assets/icons/copy.png',
    'copy': '/src/assets/icons/copy.png',
    '💾': '/src/assets/icons/download.png',
    'save': '/src/assets/icons/download.png',
    '↪': '/src/assets/icons/forward.png', // Forward
    'forward': '/src/assets/icons/forward.png',
    '⭐': '/src/assets/icons/unstar.png',
    '☆': '/src/assets/icons/star.png',
    'star': '/src/assets/icons/star.png',
    '📌': '/src/assets/icons/pin.png', // Pin
    'pin': '/src/assets/icons/pin.png',
    '🗑': '/src/assets/icons/delete.png',
    'delete': '/src/assets/icons/delete.png',
    '☑️': '/src/assets/icons/check.png',
    'select': '/src/assets/icons/check.png',
    '📤': '/src/assets/icons/share.png',
    'share': '/src/assets/icons/share.png',
    'ℹ️': '/src/assets/icons/info-2.png', // Info
    'info': '/src/assets/icons/info-2.png',
  };

  const iconPath = iconPaths[icon] || iconPaths[label.toLowerCase()] || '/src/assets/icons/doc.png';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 16px',
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none',
        color: danger ? '#ef4444' : 'rgba(255,255,255,0.9)',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '13px',
        transition: 'background 0.15s',
      }}
    >
      <img
        src={iconPath}
        alt={label}
        style={{
          width: '18px',
          height: '18px',
          objectFit: 'contain',
          filter: danger ? 'hue-rotate(300deg) saturate(2)' : 'none',
          opacity: 0.9
        }}
      />
      <span>{label}</span>
    </button>
  );
}

// Message Info Popup - shows read/delivered status with timestamps
function MessageInfoPopup({ message, isOwnMessage, onClose }: { message: Message; isOwnMessage: boolean; onClose: () => void }) {
  const formatTime = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return `${date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${timeStr}`;
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.message-info-popup')) {
        onClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="message-info-popup"
      style={{
        position: 'absolute',
        top: isOwnMessage ? 'auto' : '0',
        bottom: isOwnMessage ? '0' : 'auto',
        right: isOwnMessage ? 'calc(100% + 8px)' : 'auto',
        left: isOwnMessage ? 'auto' : 'calc(100% + 8px)',
        background: '#233138',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        padding: '12px 16px',
        zIndex: 1000,
        minWidth: '180px',
        maxWidth: '250px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Read Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: message.status === 'read' ? '12px' : '0'
      }}>
        <span style={{ color: '#53bdeb', fontSize: '14px' }}>✓✓</span>
        <div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>Read</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            {formatTime(message.read_at || message.created_at)}
          </div>
        </div>
      </div>

      {/* Delivered Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>✓✓</span>
        <div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>Delivered</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            {formatTime(message.delivered_at || message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pin Duration Modal - WhatsApp style
function PinDurationModal({
  onClose,
  onPin
}: {
  onClose: () => void;
  onPin: (duration: 'custom' | '24h' | '7d' | '30d', customMinutes?: number) => void;
}) {
  const [selectedDuration, setSelectedDuration] = useState<'24h' | '7d' | '30d' | 'custom'>('7d');
  const [customValue, setCustomValue] = useState(30);
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  const calculateMinutes = () => {
    if (customUnit === 'minutes') return customValue;
    if (customUnit === 'hours') return customValue * 60;
    return customValue * 24 * 60; // days
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }} onClick={onClose}>
      <div style={{
        background: '#1e1e2e',
        borderRadius: '12px',
        padding: '24px',
        width: '320px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px', fontWeight: 600 }}>
          Choose how long your pin lasts
        </h3>
        <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          You can unpin at any time.
        </p>

        {/* Duration options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {(['24h', '7d', '30d'] as const).map(duration => (
            <label
              key={duration}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: selectedDuration === duration ? 'none' : '2px solid rgba(255,255,255,0.4)',
                background: selectedDuration === duration ? '#25D366' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedDuration === duration && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                )}
              </div>
              <span style={{ color: '#fff', fontSize: '15px' }}>
                {duration === '24h' ? '24 hours' : duration === '7d' ? '7 days' : '30 days'}
              </span>
              <input
                type="radio"
                name="duration"
                checked={selectedDuration === duration}
                onChange={() => setSelectedDuration(duration)}
                style={{ display: 'none' }}
              />
            </label>
          ))}

          {/* Custom duration option */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            padding: '8px 0'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: selectedDuration === 'custom' ? 'none' : '2px solid rgba(255,255,255,0.4)',
              background: selectedDuration === 'custom' ? '#25D366' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedDuration === 'custom' && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
              )}
            </div>
            <span style={{ color: '#fff', fontSize: '15px' }}>Custom</span>
            <input
              type="radio"
              name="duration"
              checked={selectedDuration === 'custom'}
              onChange={() => setSelectedDuration('custom')}
              style={{ display: 'none' }}
            />
          </label>

          {/* Custom duration inputs */}
          {selectedDuration === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: '32px' }}>
              <input
                type="number"
                min="1"
                value={customValue}
                onChange={e => setCustomValue(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '60px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <select
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="minutes" style={{ background: '#1e1e2e' }}>Minutes</option>
                <option value="hours" style={{ background: '#1e1e2e' }}>Hours</option>
                <option value="days" style={{ background: '#1e1e2e' }}>Days</option>
              </select>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              background: 'transparent',
              color: '#25D366',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedDuration === 'custom') {
                onPin('custom', calculateMinutes());
              } else {
                onPin(selectedDuration);
              }
            }}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              background: '#25D366',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Pin
          </button>
        </div>
      </div>
    </div>
  );
}
