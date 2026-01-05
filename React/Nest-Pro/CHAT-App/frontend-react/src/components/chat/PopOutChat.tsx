import { useEffect, useState, useRef } from 'react';
import { MessageList } from '../chat/MessageList';
import { MessageInput } from '../chat/MessageInput';

interface PopOutChat {
    chatId: string;
    chatType: 'user' | 'room';
    chatName: string;
    avatar?: string;
}

export function PopOutChatManager() {
    const [popOuts, setPopOuts] = useState<PopOutChat[]>([]);

    useEffect(() => {
        const handleOpenPopOut = (e: CustomEvent<PopOutChat>) => {
            setPopOuts(prev => {
                // Don't add duplicate
                if (prev.find(p => p.chatId === e.detail.chatId)) return prev;
                return [...prev, e.detail];
            });
        };

        window.addEventListener('openPopOutChat', handleOpenPopOut as EventListener);
        return () => window.removeEventListener('openPopOutChat', handleOpenPopOut as EventListener);
    }, []);

    const closePopOut = (chatId: string) => {
        setPopOuts(prev => prev.filter(p => p.chatId !== chatId));
    };

    return (
        <>
            {popOuts.map((chat, index) => (
                <PopOutWindow
                    key={chat.chatId}
                    chat={chat}
                    index={index}
                    onClose={() => closePopOut(chat.chatId)}
                />
            ))}
        </>
    );
}

function PopOutWindow({ chat, index, onClose }: { chat: PopOutChat; index: number; onClose: () => void }) {
    const [position, setPosition] = useState({ x: 100 + index * 50, y: 100 + index * 50 });
    const [size, setSize] = useState({ width: 380, height: 520 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);

    const MIN_WIDTH = 300;
    const MIN_HEIGHT = 350;
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 800;

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.pop-out-header') && !isResizing) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(direction);
        setDragOffset({ x: e.clientX, y: e.clientY });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            } else if (isResizing) {
                const dx = e.clientX - dragOffset.x;
                const dy = e.clientY - dragOffset.y;

                setSize(prev => {
                    let newWidth = prev.width;
                    let newHeight = prev.height;

                    if (isResizing.includes('e')) newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, prev.width + dx));
                    if (isResizing.includes('w')) newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, prev.width - dx));
                    if (isResizing.includes('s')) newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, prev.height + dy));
                    if (isResizing.includes('n')) newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, prev.height - dy));

                    return { width: newWidth, height: newHeight };
                });

                if (isResizing.includes('w')) {
                    setPosition(prev => ({ ...prev, x: prev.x + dx }));
                }
                if (isResizing.includes('n')) {
                    setPosition(prev => ({ ...prev, y: prev.y + dy }));
                }

                setDragOffset({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(null);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset]);

    const resizeHandleStyle = (cursor: string): React.CSSProperties => ({
        position: 'absolute',
        background: 'transparent',
        zIndex: 10
    });

    return (
        <div
            ref={windowRef}
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                width: size.width,
                height: isMinimized ? 48 : size.height,
                background: '#1a1a2e',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                zIndex: 10000 + index,
                display: 'flex',
                flexDirection: 'column',
                transition: isResizing ? 'none' : 'height 0.2s ease'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Resize Handles */}
            {!isMinimized && (
                <>
                    <div style={{ ...resizeHandleStyle('e-resize'), right: 0, top: 10, bottom: 10, width: 6, cursor: 'e-resize' }} onMouseDown={e => handleResizeStart(e, 'e')} />
                    <div style={{ ...resizeHandleStyle('w-resize'), left: 0, top: 10, bottom: 10, width: 6, cursor: 'w-resize' }} onMouseDown={e => handleResizeStart(e, 'w')} />
                    <div style={{ ...resizeHandleStyle('s-resize'), left: 10, right: 10, bottom: 0, height: 6, cursor: 's-resize' }} onMouseDown={e => handleResizeStart(e, 's')} />
                    <div style={{ ...resizeHandleStyle('se-resize'), right: 0, bottom: 0, width: 12, height: 12, cursor: 'se-resize' }} onMouseDown={e => handleResizeStart(e, 'se')} />
                    <div style={{ ...resizeHandleStyle('sw-resize'), left: 0, bottom: 0, width: 12, height: 12, cursor: 'sw-resize' }} onMouseDown={e => handleResizeStart(e, 'sw')} />
                </>
            )}

            {/* Header - Draggable */}
            <div
                className="pop-out-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#25274d',
                    cursor: 'move',
                    userSelect: 'none',
                    flexShrink: 0
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '10px',
                    overflow: 'hidden',
                    flexShrink: 0
                }}>
                    {chat.avatar ? (
                        <img src={chat.avatar.startsWith('http') ? chat.avatar : `http://127.0.0.1:8000/api/files/${chat.avatar}`}
                            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ color: '#fff', fontSize: '14px' }}>{chat.chatName.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                {/* Name */}
                <span style={{ flex: 1, color: '#fff', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.chatName}</span>

                {/* Controls */}
                <button onClick={() => setIsMinimized(!isMinimized)} style={{
                    background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px'
                }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                </button>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px'
                }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </button>
            </div>

            {/* Chat Content - Responsive */}
            {!isMinimized && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        <MessageList
                            chatId={chat.chatId}
                            chatType={chat.chatType}
                            searchQuery=""
                            highlightedMessageId={null}
                        />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <MessageInput chatId={chat.chatId} chatType={chat.chatType} />
                    </div>
                </div>
            )}
        </div>
    );
}
