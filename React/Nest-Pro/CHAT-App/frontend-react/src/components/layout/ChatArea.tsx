import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useCallStore } from '../../stores/callStore';
import { MessageList } from '../chat/MessageList';
import { MessageInput } from '../chat/MessageInput';
import { AriseChat } from '../ai/AriseChat';
import { SettingsPanel } from '../settings/SettingsPanel';
import { StatusViewer } from '../status/StatusViewer';
import { MediaLinksDocsPanel } from './MediaLinksDocsPanel';

export function ChatArea() {
    const { currentView, currentChatId, currentChatType, contacts, rooms, messages, selectionMode, selectedMessages, clearSelection, deleteSelectedMessages } = useChatStore();
    const { initiateCall } = useCallStore();

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResultIndex, setSearchResultIndex] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showContactInfo, setShowContactInfo] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    // If we're in settings mode, show SettingsPanel
    if (currentView === 'settings') {
        return (
            <main className="chat-area" id="chatArea">
                <SettingsPanel />
            </main>
        );
    }

    // If we're in AI mode, show AriseChat
    if (currentView === 'arise' || currentChatType === 'arise') {
        return <AriseChat />;
    }

    // If we're in status view mode, show StatusViewer
    if (currentView === 'status') {
        return (
            <main className="chat-area" id="chatArea" style={{ padding: 0 }}>
                <StatusViewer />
            </main>
        );
    }

    // If no current chat, show empty state
    if (!currentChatId) {
        return (
            <main className="chat-area" id="chatArea">
                <div className="empty-state" id="emptyState">
                    <div className="empty-state-icon">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3>Welcome to NexusChat</h3>
                    <p>Select a conversation to start chatting or click the + button to add a new contact.</p>
                </div>
            </main>
        );
    }

    // Get current chat info
    const currentContact = currentChatType === 'user'
        ? contacts.find(c => c.contact_id === currentChatId)
        : null;
    const currentRoom = currentChatType === 'room'
        ? rooms.find(r => r.id === currentChatId)
        : null;

    const chatName = currentContact?.username || currentRoom?.name || 'Chat';
    const chatAvatar = currentContact?.avatar;
    const isOnline = currentContact?.status === 'online';
    const memberCount = currentRoom?.members?.length || 0;

    // Filter messages based on search - exclude deleted messages from search
    const chatMessages = messages[currentChatId] || [];
    const filteredMessages = searchQuery
        ? chatMessages.filter(m =>
            m.content?.toLowerCase().includes(searchQuery.toLowerCase()) &&
            m.content !== 'This message was deleted'
        )
        : chatMessages;

    const handleVideoCall = () => {
        if (currentContact) {
            initiateCall(
                currentContact.contact_id,
                currentContact.username,
                currentContact.avatar,
                'video'
            );
        }
    };

    const handleVoiceCall = () => {
        if (currentContact) {
            initiateCall(
                currentContact.contact_id,
                currentContact.username,
                currentContact.avatar,
                'voice'
            );
        }
    };

    const toggleSearch = () => {
        setShowSearch(!showSearch);
        if (!showSearch) {
            setSearchQuery('');
            setSearchResultIndex(0);
        }
    };

    // Reset search result index when query changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setSearchResultIndex(0);
    };

    // Navigate to previous search result
    const prevSearchResult = () => {
        if (filteredMessages.length > 0 && searchResultIndex > 0) {
            setSearchResultIndex(searchResultIndex - 1);
        }
    };

    // Navigate to next search result
    const nextSearchResult = () => {
        if (filteredMessages.length > 0 && searchResultIndex < filteredMessages.length - 1) {
            setSearchResultIndex(searchResultIndex + 1);
        }
    };

    // Get current highlighted message ID - only when searching
    const highlightedMessageId = searchQuery && filteredMessages.length > 0
        ? filteredMessages[searchResultIndex]?.id
        : null;

    return (
        <main className="chat-area" id="chatArea">
            {/* Contact Info Panel */}
            {showContactInfo && (
                <ContactInfoPanel
                    contact={currentContact}
                    room={currentRoom}
                    messages={chatMessages}
                    onClose={() => setShowContactInfo(false)}
                    onVideoCall={handleVideoCall}
                    onVoiceCall={handleVoiceCall}
                />
            )}

            {/* Active Chat */}
            <div className="active-chat" id="activeChat">
                {/* Selection Mode Toolbar - shows when messages are being selected */}
                {selectionMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        background: '#1a1a2e',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>
                            {selectedMessages.size} selected
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Star */}
                            <button
                                onClick={() => {/* TODO: Star selected */ }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                                title="Star"
                            >
                                <img src="/src/assets/icons/star.png" alt="Star" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                            </button>
                            {/* Copy */}
                            <button
                                onClick={() => {/* TODO: Copy selected */ }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                                title="Copy"
                            >
                                <img src="/src/assets/icons/copy.png" alt="Copy" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                            </button>
                            {/* Forward */}
                            <button
                                onClick={() => {/* TODO: Forward selected */ }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                                title="Forward"
                            >
                                <img src="/src/assets/icons/forward.png" alt="Forward" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                            </button>
                            {/* Delete */}
                            <button
                                onClick={() => deleteSelectedMessages()}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                                title="Delete"
                            >
                                <img src="/src/assets/icons/delete.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                            </button>
                            {/* Cancel */}
                            <button
                                onClick={() => clearSelection()}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    marginLeft: '8px',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat Header */}
                <header className="chat-header" style={{ display: selectionMode ? 'none' : undefined }}>
                    <div className="chat-header-info" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
                        {/* Back button for mobile */}
                        <button className="btn-icon back-btn md-hidden" id="backBtn">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="chat-header-avatar">
                            {currentContact?.avatar ? (
                                <img
                                    src={currentContact.avatar.startsWith('http')
                                        ? currentContact.avatar
                                        : `http://127.0.0.1:8000/api/files/${currentContact.avatar}`}
                                    alt={chatName}
                                />
                            ) : currentRoom?.avatar ? (
                                <img
                                    src={currentRoom.avatar.startsWith('http')
                                        ? currentRoom.avatar
                                        : `http://127.0.0.1:8000/api/files/${currentRoom.avatar}`}
                                    alt={chatName}
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    {chatName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="chat-header-details">
                            <h3>{chatName}</h3>
                            <span className={`status-text ${isOnline ? 'online' : ''}`}>
                                {currentChatType === 'room'
                                    ? `${memberCount} members`
                                    : isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className="chat-header-actions">
                        {/* Video Call */}
                        <button className="btn-icon" title="Video Call" onClick={handleVideoCall}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>

                        {/* Voice Call */}
                        <button className="btn-icon" title="Voice Call" onClick={handleVoiceCall}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </button>

                        {/* Search */}
                        <button className="btn-icon" title="Search in Chat" onClick={toggleSearch}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* More Options Dropdown */}
                        <div className="dropdown-container" ref={dropdownRef}>
                            <button className="btn-icon" title="More Options" onClick={() => setShowDropdown(!showDropdown)}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>

                            {showDropdown && (
                                <div className="dropdown-menu" style={{ right: 0, left: 'auto' }}>
                                    <button className="dropdown-item" onClick={() => { setShowContactInfo(true); setShowDropdown(false); }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>Contact Info</span>
                                    </button>
                                    <button className="dropdown-item" onClick={() => { setShowDropdown(false); }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Media</span>
                                    </button>
                                    <button className="dropdown-item" onClick={() => { setShowDropdown(false); }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        <span>Links</span>
                                    </button>
                                    <button className="dropdown-item" onClick={() => { setShowDropdown(false); }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Documents</span>
                                    </button>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                    <button className="dropdown-item" onClick={() => { setShowDropdown(false); }} style={{ color: '#ef4444' }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Clear Chat</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Search Bar */}
                {showSearch && (
                    <div style={{
                        padding: '8px 16px',
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <svg className="w-5 h-5" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                        {searchQuery && filteredMessages.length > 0 && (
                            <>
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                    {searchResultIndex + 1} of {filteredMessages.length}
                                </span>
                                {/* Up Arrow - Go to previous */}
                                <button
                                    onClick={prevSearchResult}
                                    disabled={searchResultIndex === 0}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: searchResultIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: searchResultIndex === 0 ? 'default' : 'pointer',
                                        padding: '4px',
                                        opacity: searchResultIndex === 0 ? 0.5 : 1
                                    }}
                                    title="Previous result"
                                >
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M18 15l-6-6-6 6" />
                                    </svg>
                                </button>
                                {/* Down Arrow - Go to next */}
                                <button
                                    onClick={nextSearchResult}
                                    disabled={searchResultIndex >= filteredMessages.length - 1}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: searchResultIndex >= filteredMessages.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: searchResultIndex >= filteredMessages.length - 1 ? 'default' : 'pointer',
                                        padding: '4px',
                                        opacity: searchResultIndex >= filteredMessages.length - 1 ? 0.5 : 1
                                    }}
                                    title="Next result"
                                >
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>
                            </>
                        )}
                        {searchQuery && filteredMessages.length === 0 && (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>No results</span>
                        )}
                        <button
                            onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResultIndex(0); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Messages Container */}
                <MessageList
                    chatId={currentChatId}
                    chatType={currentChatType}
                    searchQuery={searchQuery}
                    highlightedMessageId={highlightedMessageId}
                />

                {/* Message Input */}
                <MessageInput chatId={currentChatId} chatType={currentChatType} />
            </div>
        </main>
    );
}

// Contact Info Panel Component
function ContactInfoPanel({
    contact,
    room,
    messages = [],
    onClose,
    onVideoCall,
    onVoiceCall
}: {
    contact: any;
    room: any;
    messages?: any[];
    onClose: () => void;
    onVideoCall: () => void;
    onVoiceCall: () => void;
}) {
    const [showMediaPanel, setShowMediaPanel] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
        const saved = localStorage.getItem('autoSaveFiles');
        return saved === 'true';
    });

    // Toggle auto-save and persist to localStorage
    const toggleAutoSave = async () => {
        const newValue = !autoSaveEnabled;
        setAutoSaveEnabled(newValue);
        localStorage.setItem('autoSaveFiles', String(newValue));

        // If enabling, initialize the folder structure
        if (newValue) {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/files/init-folders', {
                    method: 'POST'
                });
                const result = await response.json();
                console.log('NexusChat folders initialized:', result);
            } catch (error) {
                console.error('Failed to initialize folders:', error);
            }
        }
    };

    const name = contact?.username || room?.name || 'Unknown';
    const avatar = contact?.avatar;
    const isGroup = !!room;

    return (
        <>
            {/* Click-outside overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    zIndex: 99
                }}
            />
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '340px',
                height: '100%',
                background: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--glass-border)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.2s ease'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderBottom: '1px solid var(--glass-border)'
                }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>Contact Info</span>
                </div>

                {/* Profile */}
                <div style={{ padding: '32px 20px', textAlign: 'center', borderBottom: '8px solid var(--bg-tertiary)' }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '48px',
                        color: '#fff',
                        overflow: 'hidden'
                    }}>
                        {avatar ? (
                            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        {contact?.status === 'online' ? 'Online' : 'Last seen recently'}
                    </p>

                    {/* Call Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px' }}>
                        <button onClick={onVideoCall} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer'
                        }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '12px' }}>Video</span>
                        </button>
                        <button onClick={onVoiceCall} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer'
                        }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '12px' }}>Voice</span>
                        </button>
                    </div>
                </div>

                {/* Menu Items */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div onClick={() => setShowMediaPanel(true)}>
                        <MenuItem icon="media" label="Media, Links, and Docs" />
                    </div>
                    <MenuItem icon="star" label="Starred Messages" />
                    <MenuItem icon="bell" label="Mute Notifications" toggle />

                    {/* Auto-save files toggle - WhatsApp style */}
                    <div
                        onClick={toggleAutoSave}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '14px 20px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <div style={{ color: 'var(--text-muted)' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px' }}>Auto-save Files</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Save images, videos & files to Downloads
                            </div>
                        </div>
                        {/* Toggle switch */}
                        <div style={{
                            width: '44px',
                            height: '24px',
                            borderRadius: '12px',
                            background: autoSaveEnabled ? 'rgba(37, 211, 102, 0.9)' : 'var(--bg-tertiary)',
                            position: 'relative',
                            transition: 'background 0.3s'
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: autoSaveEnabled ? '22px' : '2px',
                                top: '2px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: autoSaveEnabled ? '#fff' : 'var(--text-muted)',
                                transition: 'left 0.3s, background 0.3s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    <MenuItem icon="lock" label="Encryption" subtitle="Messages are end-to-end encrypted" />
                    {!isGroup && (
                        <MenuItem icon="block" label="Block Contact" danger />
                    )}
                </div>

                {/* Media, Links, Docs Panel */}
                <MediaLinksDocsPanel
                    isOpen={showMediaPanel}
                    onClose={() => setShowMediaPanel(false)}
                    messages={messages}
                    contactName={name}
                />

                <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
            </div>
        </>
    );
}

function MenuItem({ icon, label, subtitle, toggle, danger }: { icon: string; label: string; subtitle?: string; toggle?: boolean; danger?: boolean }) {
    const icons: Record<string, React.ReactNode> = {
        media: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
        star: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
        bell: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
        lock: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
        block: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></svg>,
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 20px',
            cursor: 'pointer',
            color: danger ? '#ef4444' : 'var(--text-primary)'
        }}>
            <div style={{ color: danger ? '#ef4444' : 'var(--text-muted)' }}>{icons[icon]}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px' }}>{label}</div>
                {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
            </div>
            {toggle && (
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: 'var(--bg-tertiary)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '2px', top: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                </div>
            )}
        </div>
    );
}
