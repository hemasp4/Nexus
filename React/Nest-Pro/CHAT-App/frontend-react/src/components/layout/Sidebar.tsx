import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAriseStore } from '../../stores/ariseStore';
import { AddContactModal } from '../modals/AddContactModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { CallHistory } from '../calls/CallHistory';
import { StatusList } from '../status/StatusList';
import { StarredMessages } from '../chat/StarredMessages';
import type { Contact, Room, AriseConversation } from '../../types';

// Store last opened chat per section
const lastChatPerSection: Record<string, { id: string; type: 'user' | 'room' | 'arise' } | null> = {
    chats: null,
    groups: null,
    arise: null,
};

export function Sidebar() {
    const { currentView, contacts, rooms, setCurrentChat, loadContacts, loadRooms, currentChatId, currentChatType } = useChatStore();
    const { conversations, loadConversations, openConversation, currentConversation, newChat } = useAriseStore();
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [archivedChats, setArchivedChats] = useState<any[]>([]);

    const API_URL = 'http://127.0.0.1:8000';

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load archived chats on initial mount to ensure proper filtering
    useEffect(() => {
        fetch(`${API_URL}/api/chats/archived`)
            .then(res => res.json())
            .then(data => setArchivedChats(data.chats || []))
            .catch(() => { });
    }, []);

    // Save current chat when switching sections
    useEffect(() => {
        if (currentChatId && currentChatType) {
            if (currentChatType === 'user') {
                lastChatPerSection.chats = { id: currentChatId, type: 'user' };
            } else if (currentChatType === 'room') {
                lastChatPerSection.groups = { id: currentChatId, type: 'room' };
            } else if (currentChatType === 'arise') {
                lastChatPerSection.arise = { id: currentChatId, type: 'arise' };
            }
        }
    }, [currentChatId, currentChatType]);

    // Restore last chat when entering a section
    useEffect(() => {
        if (currentView === 'chats') {
            loadContacts();
            // Also load archived chat IDs to filter them
            fetch(`${API_URL}/api/chats/archived`)
                .then(res => res.json())
                .then(data => setArchivedChats(data.chats || []))
                .catch(() => { });
            const last = lastChatPerSection.chats;
            if (last) {
                setCurrentChat(last.id, last.type);
            }
        } else if (currentView === 'groups') {
            loadRooms();
            const last = lastChatPerSection.groups;
            if (last) {
                setCurrentChat(last.id, last.type);
            }
        } else if (currentView === 'arise') {
            loadConversations();
            const last = lastChatPerSection.arise;
            if (last) {
                setCurrentChat(last.id, last.type);
                openConversation(last.id);
            }
        } else if (currentView === 'archived') {
            // Load archived chats
            fetch(`${API_URL}/api/chats/archived`)
                .then(res => res.json())
                .then(data => setArchivedChats(data.chats || []))
                .catch(err => console.error('Failed to load archived chats:', err));
        }
    }, [currentView, loadContacts, loadRooms, loadConversations, setCurrentChat, openConversation, API_URL]);

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

    const getTitle = () => {
        const titles: Record<string, string> = {
            chats: 'Chats',
            groups: 'Groups',
            calls: 'Calls',
            status: 'Status',
            arise: 'Arise AI',
            starred: 'Starred',
            archived: 'Archived',
            settings: 'Settings',
            profile: 'Profile',
        };
        return titles[currentView] || 'Chats';
    };

    // Toggle AI section
    const handleAriseToggle = () => {
        if (currentView === 'arise') {
            // Close AI - go back to chats
            useChatStore.getState().setCurrentView('chats');
        } else {
            // Open AI
            useChatStore.getState().setCurrentView('arise');
        }
    };

    return (
        <>
            <aside className="sidebar" id="sidebar">
                {/* Sidebar Header */}
                <header className="sidebar-header">
                    <div className="sidebar-title-section">
                        <h2 className="sidebar-title" id="sidebarTitle">{getTitle()}</h2>
                    </div>
                    <div className="sidebar-actions">
                        {/* Search Button */}
                        <button
                            className="btn-icon"
                            id="searchBtn"
                            title="Search"
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* Arise AI Toggle Button */}
                        <button
                            className={`btn-icon arise-btn ${currentView === 'arise' ? 'active' : ''}`}
                            id="ariseAiBtn"
                            title={currentView === 'arise' ? 'Close Arise AI' : 'Open Arise AI'}
                            onClick={handleAriseToggle}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </button>

                        {/* Menu Button with Dropdown */}
                        <div className="dropdown-container" ref={dropdownRef}>
                            <button
                                className="btn-icon"
                                id="newChatMenuBtn"
                                title="Menu"
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showDropdown && (
                                <div className="dropdown-menu" id="newChatDropdown">
                                    <button className="dropdown-item" onClick={() => {
                                        setShowDropdown(false);
                                        setShowCreateGroup(true);
                                    }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span>New Group</span>
                                    </button>
                                    <button className="dropdown-item" onClick={() => {
                                        setShowDropdown(false);
                                        setShowAddContact(true);
                                    }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        <span>New Contact</span>
                                    </button>
                                    <button className="dropdown-item" onClick={() => {
                                        setShowDropdown(false);
                                        // Open camera / create status
                                        useChatStore.getState().setCurrentView('status');
                                    }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Camera</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Search Box */}
                {showSearch && (
                    <div className="search-box">
                        <div className="search-input-wrapper">
                            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search contacts or messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Contact List */}
                <div className="contact-list" id="contactList">
                    {/* Chats View - exclude archived chats */}
                    {currentView === 'chats' && contacts
                        .filter(contact => !archivedChats.some(a => a.chat_id === contact.contact_id))
                        .map((contact) => (
                            <ContactItem
                                key={contact.id}
                                contact={contact}
                                isActive={currentChatId === contact.contact_id}
                                onClick={() => setCurrentChat(contact.contact_id, 'user')}
                                onArchive={() => {
                                    // Instantly add to archived
                                    setArchivedChats(prev => [...prev, {
                                        chat_id: contact.contact_id,
                                        chat_type: 'user',
                                        chat_name: contact.username,
                                        archived_at: new Date().toISOString()
                                    }]);
                                }}
                            />
                        ))}

                    {/* Groups View */}
                    {currentView === 'groups' && rooms
                        .filter(room => !archivedChats.some(a => a.chat_id === room.id))
                        .map((room) => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                isActive={currentChatId === room.id}
                                onClick={() => setCurrentChat(room.id, 'room')}
                                onArchive={() => {
                                    // Instantly add to archived and it will be filtered from groups
                                    setArchivedChats(prev => [...prev, {
                                        chat_id: room.id,
                                        chat_type: 'room',
                                        chat_name: room.name,
                                        archived_at: new Date().toISOString()
                                    }]);
                                }}
                            />
                        ))}

                    {/* Arise AI View */}
                    {currentView === 'arise' && (
                        <>
                            <AriseNewChatButton onNewChat={newChat} />
                            {conversations.map((conv) => (
                                <AriseConversationItem
                                    key={conv.id}
                                    conversation={conv}
                                    isActive={currentConversation?.id === conv.id}
                                    onClick={() => {
                                        openConversation(conv.id);
                                        setCurrentChat(conv.id, 'arise');
                                    }}
                                />
                            ))}
                            {conversations.length === 0 && (
                                <div className="empty-list-message">
                                    <p>No conversations yet</p>
                                    <p className="sub-text">Start a new chat with Arise AI</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Calls View */}
                    {currentView === 'calls' && <CallHistory />}

                    {/* Status View */}
                    {currentView === 'status' && <StatusList />}

                    {/* Starred View */}
                    {currentView === 'starred' && <StarredMessages />}

                    {/* Archived View */}
                    {/* Archived View - show archived chats with same style as contacts */}
                    {currentView === 'archived' && (
                        <>
                            {archivedChats.length > 0 ? archivedChats.map((archivedChat: any) => {
                                // Check if it's a contact or room
                                const contact = contacts.find(c => c.contact_id === archivedChat.chat_id);
                                const room = rooms.find(r => r.id === archivedChat.chat_id);
                                const chatType = archivedChat.chat_type || (room ? 'room' : 'user');
                                const chatName = contact?.username || room?.name || archivedChat.chat_name || 'Archived Chat';
                                const avatar = contact?.avatar || room?.avatar;

                                return (
                                    <ArchivedContactItem
                                        key={archivedChat.chat_id}
                                        archivedChat={{ ...archivedChat, chat_name: chatName, chat_type: chatType }}
                                        contact={contact}
                                        room={room}
                                        onClick={() => setCurrentChat(archivedChat.chat_id, chatType as 'user' | 'room')}
                                        onUnarchive={() => setArchivedChats(prev => prev.filter(c => c.chat_id !== archivedChat.chat_id))}
                                    />
                                );
                            }) : (
                                <div className="empty-list-message">
                                    <p>No archived chats</p>
                                    <p className="sub-text">Archive a chat from the dropdown menu</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty Chats */}
                    {currentView === 'chats' && contacts.length === 0 && (
                        <div className="empty-list-message">
                            <p>No contacts yet</p>
                            <p className="sub-text">Add a contact to start chatting</p>
                        </div>
                    )}

                    {/* Empty Groups */}
                    {currentView === 'groups' && rooms.length === 0 && (
                        <div className="empty-list-message">
                            <p>No groups yet</p>
                            <p className="sub-text">Create or join a group</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Modals */}
            <AddContactModal
                isOpen={showAddContact}
                onClose={() => setShowAddContact(false)}
            />
            <CreateGroupModal
                isOpen={showCreateGroup}
                onClose={() => setShowCreateGroup(false)}
            />
        </>
    );
}

// Contact Item Component
function ContactItem({ contact, isActive, onClick, onArchive }: { contact: Contact; isActive?: boolean; onClick: () => void; onArchive?: () => void }) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [showHover, setShowHover] = useState(false);
    const { setCurrentChat } = useChatStore();
    const API_URL = 'http://127.0.0.1:8000';

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDropdownClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenuPos({ x: rect.left, y: rect.bottom + 5 });
        setShowContextMenu(true);
    };

    const handleCloseMenu = () => setShowContextMenu(false);

    // API Actions
    const handleChatAction = async (action: string) => {
        try {
            await fetch(`${API_URL}/api/chats/${contact.contact_id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, chat_type: 'user', chat_name: contact.username })
            });
            handleCloseMenu();
            // Instant removal on archive
            if (action === 'archive' && onArchive) {
                onArchive();
            }
        } catch (error) {
            console.error('Chat action failed:', error);
        }
    };

    const handlePopOut = () => {
        // Store chat data for pop-out window
        const popOutData = {
            chatId: contact.contact_id,
            chatType: 'user',
            chatName: contact.username,
            avatar: contact.avatar
        };
        localStorage.setItem('popOutChat', JSON.stringify(popOutData));

        // Dispatch event to open pop-out
        window.dispatchEvent(new CustomEvent('openPopOutChat', { detail: popOutData }));
        handleCloseMenu();
    };

    const handleCloseChat = () => {
        setCurrentChat(null, null);
        handleCloseMenu();
    };

    // Close on click outside
    useEffect(() => {
        const handleClick = () => handleCloseMenu();
        if (showContextMenu) {
            window.addEventListener('click', handleClick);
        }
        return () => window.removeEventListener('click', handleClick);
    }, [showContextMenu]);

    return (
        <>
            <div
                className={`contact-item ${isActive ? 'active' : ''}`}
                onClick={onClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setShowHover(true)}
                onMouseLeave={() => setShowHover(false)}
                style={{ position: 'relative' }}
            >
                <div className="contact-avatar">
                    {contact.avatar ? (
                        <img
                            src={contact.avatar.startsWith('http') ? contact.avatar : `http://127.0.0.1:8000/api/files/${contact.avatar}`}
                            alt={contact.username}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            {contact.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <span className={`status-dot ${contact.status === 'online' ? 'online' : 'offline'}`} />
                </div>
                <div className="contact-info">
                    <span className="contact-name">{contact.username}</span>
                    {contact.last_message && (
                        <span className="contact-last-message">{contact.last_message.content}</span>
                    )}
                </div>
                {contact.unread_count && contact.unread_count > 0 && (
                    <div className="contact-meta">
                        <span className="unread-badge">{contact.unread_count}</span>
                    </div>
                )}
                {/* Dropdown Icon - shows on hover */}
                {showHover && (
                    <button
                        onClick={handleDropdownClick}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            color: '#aaa',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 10l5 5 5-5z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Context Menu - WhatsApp Style */}
            {showContextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenuPos.y,
                        left: contextMenuPos.x,
                        background: '#233138',
                        borderRadius: '3px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                        zIndex: 10000,
                        minWidth: '200px',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.1s ease'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>}
                        label="Mark as unread"
                        onClick={() => handleChatAction('mark_unread')}
                    />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2v6M12 8l3-3M12 8l-3-3M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>}
                        label="Pin to top"
                        onClick={() => handleChatAction('pin_to_top')}
                    />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 8v13H3V8M1 3h22v5H1z" /><path d="M10 12h4" /></svg>}
                        label="Archive"
                        onClick={() => handleChatAction('archive')}
                    />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>}
                        label="Clear messages"
                        onClick={() => { if (confirm('Clear all messages? This cannot be undone.')) handleChatAction('clear_messages'); }}
                    />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>}
                        label="Delete"
                        danger
                        onClick={() => { if (confirm('Delete this chat permanently? This cannot be undone.')) handleChatAction('delete_chat'); }}
                    />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M18 3h3v3M10 14L21 3" /></svg>}
                        label="Pop-out chat"
                        onClick={handlePopOut}
                    />
                    <ContextMenuItem
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>}
                        label="Close chat"
                        onClick={handleCloseChat}
                    />
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}

// Context Menu Item
function ContextMenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                color: danger ? '#ef4444' : '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ color: danger ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>{icon}</span>
            {label}
        </button>
    );
}

// Archived Contact Item Component with Dropdown
function ArchivedContactItem({ archivedChat, contact, room, onClick, onUnarchive }: { archivedChat: any; contact?: Contact; room?: Room; onClick: () => void; onUnarchive: () => void }) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [showHover, setShowHover] = useState(false);
    const { setCurrentChat } = useChatStore();
    const API_URL = 'http://127.0.0.1:8000';

    // Determine display values based on contact or room
    const chatName = archivedChat.chat_name || contact?.username || room?.name || 'Archived Chat';
    const avatar = contact?.avatar || room?.avatar;
    const chatType = archivedChat.chat_type || (room ? 'room' : 'user');

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDropdownClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenuPos({ x: rect.left, y: rect.bottom + 5 });
        setShowContextMenu(true);
    };

    const handleCloseMenu = () => setShowContextMenu(false);

    const handleChatAction = async (action: string) => {
        try {
            await fetch(`${API_URL}/api/chats/${archivedChat.chat_id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, chat_type: chatType })
            });
            handleCloseMenu();
            if (action === 'unarchive') onUnarchive();
        } catch (error) { console.error('Action failed:', error); }
    };

    const handlePopOut = () => {
        const popOutData = { chatId: archivedChat.chat_id, chatType, chatName, avatar };
        localStorage.setItem('popOutChat', JSON.stringify(popOutData));
        window.dispatchEvent(new CustomEvent('openPopOutChat', { detail: popOutData }));
        handleCloseMenu();
    };

    useEffect(() => {
        const handleClick = () => handleCloseMenu();
        if (showContextMenu) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [showContextMenu]);

    return (
        <>
            <div
                className="contact-item"
                onClick={onClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setShowHover(true)}
                onMouseLeave={() => setShowHover(false)}
                style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
            >
                <div className="contact-avatar" style={{ position: 'relative' }}>
                    {avatar ? (
                        <img src={avatar.startsWith('http') ? avatar : `${API_URL}/api/files/${avatar}`}
                            alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        <div className="avatar-placeholder">
                            {chatName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {chatType === 'room' && (
                        <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="8" height="8" fill="#fff" viewBox="0 0 24 24">
                                <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="contact-info">
                    <span className="contact-name">{chatName}</span>
                    <span className="contact-last-message" style={{ color: '#888', fontSize: '11px' }}>
                        {chatType === 'room' ? 'Group • ' : ''}Archived {archivedChat.archived_at ? new Date(archivedChat.archived_at).toLocaleDateString() : ''}
                    </span>
                </div>
                {showHover && (
                    <button onClick={handleDropdownClick} style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '4px',
                        padding: '4px 6px', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center'
                    }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
                    </button>
                )}
            </div>
            {showContextMenu && (
                <div style={{
                    position: 'fixed', top: contextMenuPos.y, left: contextMenuPos.x,
                    background: '#233138', borderRadius: '3px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    zIndex: 10000, minWidth: '200px', overflow: 'hidden', animation: 'fadeIn 0.1s ease'
                }} onClick={(e) => e.stopPropagation()}>
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 8v13H3V8M1 3h22v5H1z" /><path d="M10 12h4" /></svg>} label="Unarchive" onClick={() => handleChatAction('unarchive')} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>} label="Mark as unread" onClick={() => handleChatAction('mark_unread')} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>} label="Clear messages" onClick={() => { if (confirm('Clear all messages?')) handleChatAction('clear_messages'); }} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>} label="Delete" danger onClick={() => { if (confirm('Delete this chat?')) handleChatAction('delete_chat'); }} />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M18 3h3v3M10 14L21 3" /></svg>} label="Pop-out chat" onClick={handlePopOut} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>} label="Close chat" onClick={() => { setCurrentChat(null, null); handleCloseMenu(); }} />
                </div>
            )}
        </>
    );
}


// Room Item Component with Dropdown
function RoomItem({ room, isActive, onClick, onArchive }: { room: Room; isActive?: boolean; onClick: () => void; onArchive?: () => void }) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [showHover, setShowHover] = useState(false);
    const { setCurrentChat } = useChatStore();
    const API_URL = 'http://127.0.0.1:8000';

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDropdownClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenuPos({ x: rect.left, y: rect.bottom + 5 });
        setShowContextMenu(true);
    };

    const handleCloseMenu = () => setShowContextMenu(false);

    const handleChatAction = async (action: string) => {
        try {
            await fetch(`${API_URL}/api/chats/${room.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, chat_type: 'room', chat_name: room.name })
            });
            handleCloseMenu();
            // Instant removal from groups list when archiving
            if (action === 'archive' && onArchive) {
                onArchive();
            }
        } catch (error) { console.error('Action failed:', error); }
    };

    const handlePopOut = () => {
        const popOutData = { chatId: room.id, chatType: 'room', chatName: room.name, avatar: undefined };
        localStorage.setItem('popOutChat', JSON.stringify(popOutData));
        window.dispatchEvent(new CustomEvent('openPopOutChat', { detail: popOutData }));
        handleCloseMenu();
    };

    useEffect(() => {
        const handleClick = () => handleCloseMenu();
        if (showContextMenu) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [showContextMenu]);

    return (
        <>
            <div
                className={`contact-item ${isActive ? 'active' : ''}`}
                onClick={onClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setShowHover(true)}
                onMouseLeave={() => setShowHover(false)}
                style={{ position: 'relative' }}
            >
                <div className="contact-avatar">
                    <div className="avatar-placeholder group-avatar">
                        {room.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                </div>
                <div className="contact-info">
                    <span className="contact-name">{room.name}</span>
                    <span className="contact-last-message">{room.members?.length || 0} members</span>
                </div>
                {showHover && (
                    <button onClick={handleDropdownClick} style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '4px',
                        padding: '4px 6px', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center'
                    }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
                    </button>
                )}
            </div>
            {showContextMenu && (
                <div style={{
                    position: 'fixed', top: contextMenuPos.y, left: contextMenuPos.x,
                    background: '#233138', borderRadius: '3px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    zIndex: 10000, minWidth: '200px', overflow: 'hidden', animation: 'fadeIn 0.1s ease'
                }} onClick={(e) => e.stopPropagation()}>
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>} label="Mark as unread" onClick={() => handleChatAction('mark_unread')} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2v6M12 8l3-3M12 8l-3-3M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>} label="Pin to top" onClick={() => handleChatAction('pin_to_top')} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 8v13H3V8M1 3h22v5H1z" /><path d="M10 12h4" /></svg>} label="Archive" onClick={() => handleChatAction('archive')} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>} label="Clear messages" onClick={() => { if (confirm('Clear all messages?')) handleChatAction('clear_messages'); }} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>} label="Delete" danger onClick={() => { if (confirm('Delete this group?')) handleChatAction('delete_chat'); }} />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M18 3h3v3M10 14L21 3" /></svg>} label="Pop-out chat" onClick={handlePopOut} />
                    <ContextMenuItem icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>} label="Close chat" onClick={() => { setCurrentChat(null, null); handleCloseMenu(); }} />
                </div>
            )}
        </>
    );
}

// Arise New Chat Button
function AriseNewChatButton({ onNewChat }: { onNewChat: () => void }) {
    return (
        <button className="arise-new-chat-btn" onClick={onNewChat}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
        </button>
    );
}

// Arise Conversation Item
function AriseConversationItem({
    conversation,
    isActive,
    onClick
}: {
    conversation: AriseConversation;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <div className={`contact-item arise-item ${isActive ? 'active' : ''}`} onClick={onClick}>
            <div className="arise-icon">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <div className="contact-info">
                <span className="contact-name">{conversation.title || 'New Chat'}</span>
            </div>
        </div>
    );
}
