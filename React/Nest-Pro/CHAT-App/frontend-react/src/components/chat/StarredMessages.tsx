import { useEffect, useMemo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import type { Message } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface StarredChat {
    chatId: string;
    chatName: string;
    chatType: 'user' | 'room';
    avatar?: string;
    messages: Message[];
    lastMessageTime: string;
}

export function StarredMessages() {
    const { starredMessages, loadStarredMessages, setCurrentView, setCurrentChat, setViewingStarredChat, contacts, rooms } = useChatStore();
    const { user } = useAuthStore();

    useEffect(() => {
        loadStarredMessages();
    }, [loadStarredMessages]);

    // Group starred messages by chat (contact or room)
    const groupedChats = useMemo(() => {
        const chatMap = new Map<string, StarredChat>();

        starredMessages.forEach((msg) => {
            // Determine chat ID - for direct messages, use the other person's ID
            let chatId: string;
            let chatType: 'user' | 'room';
            let chatName = 'Unknown';
            let avatar: string | undefined;

            if (msg.room_id) {
                chatId = msg.room_id;
                chatType = 'room';
                const room = rooms.find(r => r.id === msg.room_id);
                chatName = room?.name || 'Group';
                avatar = room?.avatar;
            } else {
                // Direct message - determine the other participant
                const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
                chatId = otherUserId || msg.sender_id;
                chatType = 'user';

                // Find contact info
                const contact = contacts.find(c => c.id === chatId || c.contact_id === chatId);
                if (contact) {
                    chatName = contact.username;
                    avatar = contact.avatar;
                } else if (msg.sender_id !== user?.id) {
                    chatName = msg.sender_username || 'Unknown';
                }
            }

            if (!chatMap.has(chatId)) {
                chatMap.set(chatId, {
                    chatId,
                    chatName,
                    chatType,
                    avatar,
                    messages: [],
                    lastMessageTime: msg.created_at || msg.timestamp || new Date().toISOString(),
                });
            }

            const chat = chatMap.get(chatId)!;
            chat.messages.push(msg);

            // Update last message time if newer
            const msgTimeStr = msg.created_at || msg.timestamp || '';
            const msgTime = msgTimeStr ? new Date(msgTimeStr).getTime() : 0;
            if (msgTime > new Date(chat.lastMessageTime).getTime()) {
                chat.lastMessageTime = msgTimeStr || chat.lastMessageTime;
            }
        });

        // Sort by last message time
        return Array.from(chatMap.values()).sort(
            (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
    }, [starredMessages, contacts, rooms, user?.id]);

    const handleChatClick = (chat: StarredChat) => {
        // Navigate to the chat and show only starred messages
        setViewingStarredChat(true);
        setCurrentChat(chat.chatId, chat.chatType);
        setCurrentView('chats');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#1a1a2e',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                background: '#252536',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
            }}>
                <button
                    onClick={() => setCurrentView('chats')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '4px',
                    }}
                >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#fff' }}>
                    Starred messages
                </h2>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                }}>
                    <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search starred messages"
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '14px',
                        }}
                    />
                </div>
            </div>

            {/* Chats with starred messages */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {groupedChats.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        padding: '40px',
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                    }}>
                        <svg width="64" height="64" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <p style={{ marginTop: '16px', fontSize: '15px' }}>No starred messages</p>
                        <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
                            Tap and hold on a message to star it
                        </p>
                    </div>
                ) : (
                    groupedChats.map((chat) => (
                        <div
                            key={chat.chatId}
                            onClick={() => handleChatClick(chat)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: chat.avatar ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                            }}>
                                {chat.avatar ? (
                                    <img
                                        src={chat.avatar.startsWith('http') ? chat.avatar : `${API_URL}/api/files/${chat.avatar}`}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerHTML = `<span style="color: #fff; font-size: 18px; font-weight: 500;">${chat.chatName.charAt(0).toUpperCase()}</span>`;
                                        }}
                                    />
                                ) : (
                                    <span style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>
                                        {chat.chatName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* Chat info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500, color: '#fff', fontSize: '15px' }}>
                                        {chat.chatName}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                        {chat.messages.length} ⭐
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'rgba(255,255,255,0.5)',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    {chat.chatType === 'room' && (
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    )}
                                    <span>{chat.chatType === 'room' ? 'Group' : 'Direct message'}</span>
                                </div>
                            </div>

                            {/* Arrow icon */}
                            <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

