import { useState } from 'react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
    isOwnMessage: boolean;
    messagePreview?: string;
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onDeleteForMe,
    onDeleteForEveryone,
    isOwnMessage,
    messagePreview
}: DeleteConfirmModalProps) {
    const [selectedOption, setSelectedOption] = useState<'forMe' | 'forEveryone'>('forMe');

    if (!isOpen) return null;

    const handleDelete = () => {
        if (selectedOption === 'forEveryone' && isOwnMessage) {
            onDeleteForEveryone();
        } else {
            onDeleteForMe();
        }
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1e1e2e',
                    borderRadius: '16px',
                    width: '320px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h3 style={{
                        margin: 0,
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 600
                    }}>
                        Delete message?
                    </h3>
                </div>

                {/* Message Preview */}
                {messagePreview && (
                    <div style={{
                        padding: '12px 20px',
                        background: 'rgba(0,0,0,0.2)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <p style={{
                            margin: 0,
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            "{messagePreview.slice(0, 50)}{messagePreview.length > 50 ? '...' : ''}"
                        </p>
                    </div>
                )}

                {/* Options */}
                <div style={{ padding: '16px 20px' }}>
                    {/* Delete for Me */}
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: selectedOption === 'forMe' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            transition: 'background 0.2s'
                        }}
                    >
                        <input
                            type="radio"
                            name="deleteOption"
                            checked={selectedOption === 'forMe'}
                            onChange={() => setSelectedOption('forMe')}
                            style={{ display: 'none' }}
                        />
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `2px solid ${selectedOption === 'forMe' ? '#6366f1' : 'rgba(255,255,255,0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {selectedOption === 'forMe' && (
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: '#6366f1'
                                }} />
                            )}
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                                Delete for me
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                Only you won't see this message
                            </div>
                        </div>
                    </label>

                    {/* Delete for Everyone - only for own messages */}
                    {isOwnMessage && (
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                marginTop: '4px',
                                background: selectedOption === 'forEveryone' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                transition: 'background 0.2s'
                            }}
                        >
                            <input
                                type="radio"
                                name="deleteOption"
                                checked={selectedOption === 'forEveryone'}
                                onChange={() => setSelectedOption('forEveryone')}
                                style={{ display: 'none' }}
                            />
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: `2px solid ${selectedOption === 'forEveryone' ? '#6366f1' : 'rgba(255,255,255,0.3)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {selectedOption === 'forEveryone' && (
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#6366f1'
                                    }} />
                                )}
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                                    Delete for everyone
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                    This message will be removed for all
                                </div>
                            </div>
                        </label>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 20px 20px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
