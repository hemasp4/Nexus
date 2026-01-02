import { useEffect, useState, useRef } from 'react';
import { useStatusStore } from '../../stores/statusStore';
import { useAuthStore } from '../../stores/authStore';
import { CreateStatusModal } from './CreateStatusModal';

const API_URL = 'http://127.0.0.1:8000';

export function StatusList() {
    const {
        myStatuses, recentStatuses, viewedStatuses,
        loadMyStatuses, loadContactStatuses, viewUserStatus,
        deleteAllStatuses, isLoadingStatuses
    } = useStatusStore();
    const { user } = useAuthStore();
    const [showMyStatusMenu, setShowMyStatusMenu] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMyStatuses();
        loadContactStatuses();
    }, [loadMyStatuses, loadContactStatuses]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMyStatusMenu(false);
            }
        };
        if (showMyStatusMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMyStatusMenu]);

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

    const handleViewMyStatus = () => {
        setShowMyStatusMenu(false);
        if (user?.id && myStatuses.length > 0) {
            viewUserStatus(user.id);
        }
    };

    const handleAddStatus = () => {
        setShowMyStatusMenu(false);
        setShowCreateModal(true);
    };

    const handleDeleteAllStatus = async () => {
        setShowMyStatusMenu(false);
        if (confirm('Delete all your status updates?')) {
            await deleteAllStatuses();
        }
    };

    return (
        <>
            <div style={{ height: '100%', overflow: 'auto' }}>
                {/* My Status Section */}
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', cursor: 'pointer' }}
                        onClick={myStatuses.length > 0 ? handleViewMyStatus : handleAddStatus}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '50%', border: myStatuses.length > 0 ? '2px solid #6366f1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6366f1', fontSize: '20px', color: '#fff', fontWeight: 600, overflow: 'hidden' }}>
                            {user?.avatar ? (
                                <img src={`${API_URL}/api/files/${user.avatar}`} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                user?.username?.charAt(0)?.toUpperCase() || 'U'
                            )}
                            {myStatuses.length === 0 && (
                                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '18px', height: '18px', background: '#6366f1', border: '2px solid #0f0f17', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5" /></svg>
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: '#fff', fontSize: '15px' }}>My status</div>
                            <div style={{ fontSize: '13px', color: '#71717a' }}>{myStatuses.length > 0 ? 'Tap to view' : 'Tap to add status update'}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowMyStatusMenu(!showMyStatusMenu); }} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', borderRadius: '6px' }}>
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                        </button>
                    </div>

                    {/* Dropdown Menu */}
                    {showMyStatusMenu && (
                        <div style={{ position: 'absolute', top: '60px', right: '16px', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px', zIndex: 100, minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                            {myStatuses.length > 0 && (
                                <MenuButton icon="eye" label="View status" onClick={handleViewMyStatus} />
                            )}
                            <MenuButton icon="plus" label="Add new status" onClick={handleAddStatus} />
                            {myStatuses.length > 0 && (
                                <MenuButton icon="trash" label="Delete all status" onClick={handleDeleteAllStatus} danger />
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Updates */}
                {recentStatuses.length > 0 && (
                    <div>
                        <h4 style={{ padding: '12px 16px', fontSize: '11px', color: '#71717a', fontWeight: 600, letterSpacing: '0.5px' }}>RECENT UPDATES</h4>
                        {recentStatuses.map((contact) => (
                            <StatusContactItem key={contact.user_id} contact={contact} onClick={() => viewUserStatus(contact.user_id)} formatTime={formatTime} />
                        ))}
                    </div>
                )}

                {/* Viewed Updates */}
                {viewedStatuses.length > 0 && (
                    <div>
                        <h4 style={{ padding: '12px 16px', fontSize: '11px', color: '#71717a', fontWeight: 600, letterSpacing: '0.5px' }}>VIEWED UPDATES</h4>
                        {viewedStatuses.map((contact) => (
                            <StatusContactItem key={contact.user_id} contact={contact} onClick={() => viewUserStatus(contact.user_id)} formatTime={formatTime} viewed />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {recentStatuses.length === 0 && viewedStatuses.length === 0 && !isLoadingStatuses && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                        No status updates from your contacts
                    </div>
                )}
            </div>

            {/* Create Status Modal */}
            <CreateStatusModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); loadMyStatuses(); }} />
        </>
    );
}

// Menu button component
function MenuButton({ icon, label, onClick, danger = false }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
    const icons: Record<string, React.ReactNode> = {
        eye: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /></svg>,
        plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5" /></svg>,
        trash: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    };

    return (
        <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: danger ? '#ef4444' : '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '13px' }} onMouseOver={(e) => e.currentTarget.style.background = '#2a2a3e'} onMouseOut={(e) => e.currentTarget.style.background = 'none'}>
            {icons[icon]}
            {label}
        </button>
    );
}

// Status contact item
function StatusContactItem({ contact, onClick, formatTime, viewed = false }: { contact: { user_id: string; username: string; avatar?: string; latest_time: string; status_count: number }; onClick: () => void; formatTime: (t: string) => string; viewed?: boolean }) {
    return (
        <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: `2px solid ${viewed ? '#555' : '#6366f1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', fontSize: '20px', color: '#fff', fontWeight: 600, overflow: 'hidden' }}>
                {contact.avatar ? (
                    <img src={`http://127.0.0.1:8000/api/files/${contact.avatar}`} alt={contact.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    contact.username?.charAt(0)?.toUpperCase() || 'U'
                )}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#fff', fontSize: '15px' }}>{contact.username}</div>
                <div style={{ fontSize: '13px', color: '#71717a' }}>{formatTime(contact.latest_time)}</div>
            </div>
        </div>
    );
}
