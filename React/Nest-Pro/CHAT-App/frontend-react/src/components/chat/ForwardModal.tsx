import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { Message, Contact } from '../../types';
import api from '../../api/config';

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: Message | null;
}

export function ForwardModal({ isOpen, onClose, message }: ForwardModalProps) {
    const { contacts } = useChatStore();
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [isForwarding, setIsForwarding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedContacts([]);
            setSearchQuery('');
        }
    }, [isOpen]);

    if (!isOpen || !message) return null;

    const filteredContacts = contacts.filter((contact) =>
        contact.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleContact = (contactId: string) => {
        setSelectedContacts((prev) =>
            prev.includes(contactId)
                ? prev.filter((id) => id !== contactId)
                : [...prev, contactId]
        );
    };

    const handleForward = async () => {
        if (selectedContacts.length === 0) return;

        setIsForwarding(true);
        try {
            // Forward message to each selected contact
            for (const contactId of selectedContacts) {
                await api.post('/api/messages/', {
                    receiver_id: contactId,
                    content: message.content,
                    message_type: message.message_type,
                    file_id: message.file_id,
                    file_name: message.file_name,
                    file_size: message.file_size,
                });
            }
            onClose();
        } catch (error) {
            console.error('Failed to forward message:', error);
        } finally {
            setIsForwarding(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'flex-end',
            }}
            onClick={onClose}
        >
            {/* Forward Panel - slides in from right like WhatsApp */}
            <div
                style={{
                    width: '350px',
                    maxWidth: '100%',
                    height: '100%',
                    background: '#1a1a2e',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
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
                        onClick={onClose}
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
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#fff' }}>Forward to...</h3>
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
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Message Preview */}
                {message && (
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(99,102,241,0.1)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                            Forwarding:
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {message.message_type === 'text' ? message.content : `📎 ${message.file_name || 'File'}`}
                        </div>
                    </div>
                )}

                {/* Contact List */}
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                    {filteredContacts.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'rgba(255,255,255,0.5)',
                        }}>
                            No contacts found
                        </div>
                    ) : (
                        filteredContacts.map((contact) => (
                            <div
                                key={contact.id}
                                onClick={() => toggleContact(contact.contact_id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    background: selectedContacts.includes(contact.contact_id)
                                        ? 'rgba(99,102,241,0.15)'
                                        : 'transparent',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                }}>
                                    {contact.avatar ? (
                                        <img src={contact.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        contact.username.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Name */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '15px',
                                        color: '#fff',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {contact.username}
                                    </div>
                                </div>

                                {/* Checkbox */}
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    border: selectedContacts.includes(contact.contact_id)
                                        ? '2px solid #6366f1'
                                        : '2px solid rgba(255,255,255,0.3)',
                                    background: selectedContacts.includes(contact.contact_id)
                                        ? '#6366f1'
                                        : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {selectedContacts.includes(contact.contact_id) && (
                                        <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer with Forward Button */}
                {selectedContacts.length > 0 && (
                    <div style={{
                        padding: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'center',
                    }}>
                        <button
                            onClick={handleForward}
                            disabled={isForwarding}
                            style={{
                                padding: '12px 32px',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '24px',
                                color: '#fff',
                                fontSize: '15px',
                                fontWeight: 500,
                                cursor: isForwarding ? 'not-allowed' : 'pointer',
                                opacity: isForwarding ? 0.7 : 1,
                            }}
                        >
                            {isForwarding ? 'Forwarding...' : `Forward (${selectedContacts.length})`}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

function ForwardContactItem({
    contact,
    isSelected,
    onToggle,
}: {
    contact: Contact;
    isSelected: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`forward-contact-item ${isSelected ? 'selected' : ''}`} onClick={onToggle}>
            <div className="contact-avatar">
                {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.username} />
                ) : (
                    <div className="avatar-placeholder">
                        {contact.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="contact-info">
                <span className="contact-name">{contact.username}</span>
            </div>
            <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                {isSelected && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        </div>
    );
}
