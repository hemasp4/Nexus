import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';

const API_URL = 'http://127.0.0.1:8000';

interface ContactInfoPanelProps {
    isOpen: boolean;
    onClose: () => void;
    contactId: string;
    contactName: string;
    contactAvatar?: string;
    status?: string;
    onOpenMediaLinks?: () => void;
    onOpenStarredMessages?: () => void;
}

export function ContactInfoPanel({
    isOpen,
    onClose,
    contactId,
    contactName,
    contactAvatar,
    status = 'offline',
    onOpenMediaLinks,
    onOpenStarredMessages
}: ContactInfoPanelProps) {
    const [muteNotifications, setMuteNotifications] = useState(false);
    const [autoSaveFiles, setAutoSaveFiles] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const { settings } = useSettingsStore();

    // Load per-contact settings
    useEffect(() => {
        if (isOpen && contactId) {
            const savedSettings = localStorage.getItem(`contact_settings_${contactId}`);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setMuteNotifications(parsed.muteNotifications || false);
                setAutoSaveFiles(parsed.autoSaveFiles ?? settings.autoSaveFiles ?? false);
            }
        }
    }, [isOpen, contactId, settings.autoSaveFiles]);

    const saveContactSetting = (key: string, value: boolean) => {
        const savedSettings = localStorage.getItem(`contact_settings_${contactId}`) || '{}';
        const parsed = JSON.parse(savedSettings);
        parsed[key] = value;
        localStorage.setItem(`contact_settings_${contactId}`, JSON.stringify(parsed));
    };

    const handleMuteToggle = () => {
        const newValue = !muteNotifications;
        setMuteNotifications(newValue);
        saveContactSetting('muteNotifications', newValue);
    };

    const handleAutoSaveToggle = () => {
        const newValue = !autoSaveFiles;
        setAutoSaveFiles(newValue);
        saveContactSetting('autoSaveFiles', newValue);
    };

    const handleVideoCall = () => {
        window.dispatchEvent(new CustomEvent('startCall', {
            detail: { contactId, isVideo: true }
        }));
    };

    const handleVoiceCall = () => {
        window.dispatchEvent(new CustomEvent('startCall', {
            detail: { contactId, isVideo: false }
        }));
    };

    const handleBlockContact = async () => {
        try {
            await fetch(`${API_URL}/api/contacts/${contactId}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setShowBlockConfirm(false);
            onClose();
        } catch (error) {
            console.error('Failed to block contact:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '360px',
            background: '#1a1a2e',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button onClick={onClose} style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '8px',
                    marginRight: '8px'
                }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Contact Info</h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Avatar & Name Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '32px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                        {contactAvatar ? (
                            <img
                                src={contactAvatar.startsWith('http') ? contactAvatar : `${API_URL}/api/files/${contactAvatar}`}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ color: '#fff', fontSize: '36px', fontWeight: 500 }}>
                                {contactName?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <h2 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '22px', fontWeight: 500 }}>
                        {contactName}
                    </h2>
                    <span style={{
                        color: status === 'online' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                        fontSize: '14px',
                        textTransform: 'capitalize'
                    }}>
                        {status}
                    </span>

                    {/* Call Buttons */}
                    <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                        <button onClick={handleVideoCall} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#6366f1',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(99, 102, 241, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M23 7l-7 5 7 5V7z" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '12px' }}>Video</span>
                        </button>
                        <button onClick={handleVoiceCall} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#6366f1',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(99, 102, 241, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '12px' }}>Voice</span>
                        </button>
                    </div>
                </div>

                {/* Menu Items */}
                <div style={{ padding: '8px 0' }}>
                    {/* Media, Links, and Docs */}
                    <MenuItem
                        icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>}
                        label="Media, Links, and Docs"
                        onClick={onOpenMediaLinks}
                    />

                    {/* Starred Messages */}
                    <MenuItem
                        icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>}
                        label="Starred Messages"
                        onClick={onOpenStarredMessages}
                    />

                    {/* Mute Notifications */}
                    <ToggleMenuItem
                        icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>}
                        label="Mute Notifications"
                        value={muteNotifications}
                        onToggle={handleMuteToggle}
                    />

                    {/* Auto-save Files */}
                    <ToggleMenuItem
                        icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>}
                        label="Auto-save Files"
                        subtitle="Save images, videos & files to Downloads"
                        value={autoSaveFiles}
                        onToggle={handleAutoSaveToggle}
                    />

                    {/* Encryption */}
                    <MenuItem
                        icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>}
                        label="Encryption"
                        subtitle="Messages are end-to-end encrypted"
                        showLock
                    />
                </div>

                {/* Block Contact */}
                <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setShowBlockConfirm(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            borderRadius: '8px'
                        }}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        <span style={{ fontSize: '15px' }}>Block Contact</span>
                    </button>
                </div>
            </div>

            {/* Block Confirm Modal */}
            {showBlockConfirm && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#252536',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '300px'
                    }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>Block {contactName}?</h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 20px 0' }}>
                            They won't be able to send you messages or call you.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowBlockConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockContact}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#ef4444',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                Block
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Menu Item Component
function MenuItem({ icon, label, subtitle, onClick, showLock }: {
    icon: React.ReactNode;
    label: string;
    subtitle?: string;
    onClick?: () => void;
    showLock?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: onClick ? 'pointer' : 'default',
                textAlign: 'left'
            }}
        >
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px' }}>{label}</div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {showLock && (
                <svg width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            )}
            {onClick && (
                <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            )}
        </button>
    );
}

// Toggle Menu Item Component
function ToggleMenuItem({ icon, label, subtitle, value, onToggle }: {
    icon: React.ReactNode;
    label: string;
    subtitle?: string;
    value: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '14px 20px',
                cursor: 'pointer'
            }}
            onClick={onToggle}
        >
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', color: '#fff' }}>{label}</div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {/* Toggle Switch */}
            <div style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: value ? '#6366f1' : 'rgba(255,255,255,0.2)',
                position: 'relative',
                transition: 'background 0.2s'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: value ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s'
                }} />
            </div>
        </div>
    );
}
