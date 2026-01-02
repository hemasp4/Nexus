import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { Contact } from '../../types';
import api from '../../api/config';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const { contacts, loadRooms } = useChatStore();
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [step, setStep] = useState<'info' | 'members'>('info');

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setGroupName('');
            setSelectedMembers([]);
            setStep('info');
        }
    }, [isOpen]);

    const toggleMember = (contactId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(contactId)
                ? prev.filter((id) => id !== contactId)
                : [...prev, contactId]
        );
    };

    const handleNext = () => {
        if (groupName.trim()) {
            setStep('members');
        }
    };

    const handleBack = () => {
        setStep('info');
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        setIsCreating(true);
        try {
            await api.post('/api/rooms', {
                name: groupName,
                type: 'group',
                members: selectedMembers,
            });

            // Reload rooms
            await loadRooms();
            onClose();
        } catch (error) {
            console.error('Failed to create group:', error);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container create-group-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    {step === 'members' && (
                        <button className="modal-back-btn" onClick={handleBack}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <h3>{step === 'info' ? 'New Group' : 'Add Members'}</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Step 1: Group Info */}
                {step === 'info' && (
                    <div className="group-info-step">
                        <div className="group-avatar-picker">
                            <div className="group-avatar-placeholder">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <span>Add Group Icon</span>
                        </div>

                        <div className="group-name-input">
                            <label>Group Name</label>
                            <input
                                type="text"
                                placeholder="Enter group name..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                maxLength={50}
                                autoFocus
                            />
                            <span className="char-count">{groupName.length}/50</span>
                        </div>

                        <button
                            className="modal-btn primary full-width"
                            onClick={handleNext}
                            disabled={!groupName.trim()}
                        >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Step 2: Select Members */}
                {step === 'members' && (
                    <div className="members-step">
                        {/* Selected Members Preview */}
                        {selectedMembers.length > 0 && (
                            <div className="selected-members-preview">
                                {selectedMembers.map((memberId) => {
                                    const member = contacts.find(c => c.contact_id === memberId);
                                    if (!member) return null;
                                    return (
                                        <div key={memberId} className="selected-member-chip">
                                            <div className="chip-avatar">
                                                {member.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span>{member.username}</span>
                                            <button onClick={() => toggleMember(memberId)}>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Contact List */}
                        <div className="members-list">
                            {contacts.length === 0 ? (
                                <div className="no-contacts">
                                    <p>No contacts to add</p>
                                    <span>Add contacts first before creating a group</span>
                                </div>
                            ) : (
                                contacts.map((contact) => (
                                    <MemberSelectItem
                                        key={contact.id}
                                        contact={contact}
                                        isSelected={selectedMembers.includes(contact.contact_id)}
                                        onToggle={() => toggleMember(contact.contact_id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Create Button */}
                        <button
                            className="modal-btn primary full-width"
                            onClick={handleCreate}
                            disabled={selectedMembers.length === 0 || isCreating}
                        >
                            {isCreating ? 'Creating...' : `Create Group (${selectedMembers.length} members)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function MemberSelectItem({
    contact,
    isSelected,
    onToggle,
}: {
    contact: Contact;
    isSelected: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`member-select-item ${isSelected ? 'selected' : ''}`} onClick={onToggle}>
            <div className="member-avatar">
                {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.username} />
                ) : (
                    <div className="avatar-placeholder">
                        {contact.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="member-info">
                <span className="member-name">{contact.username}</span>
                <span className="member-status">{contact.status || 'offline'}</span>
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
