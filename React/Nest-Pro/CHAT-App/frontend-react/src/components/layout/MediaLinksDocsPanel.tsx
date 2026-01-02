import { useState } from 'react';
import type { Message } from '../../types';

const API_URL = 'http://127.0.0.1:8000';

// URL regex for detecting links
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface MediaLinksDocsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    contactName: string;
    onImageClick?: (fileId: string, fileName: string) => void;
    onVideoClick?: (fileId: string, fileName: string) => void;
}

type TabType = 'media' | 'links' | 'docs';

export function MediaLinksDocsPanel({
    isOpen,
    onClose,
    messages,
    contactName,
    onImageClick,
    onVideoClick
}: MediaLinksDocsPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('media');
    const [searchQuery, setSearchQuery] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Selection mode states
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Toggle selection
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedItems(new Set());
        setSelectionMode(false);
    };

    // Filter by file size
    const filterBySize = (fileSize?: number) => {
        if (sizeFilter === 'all' || !fileSize) return true;
        const mb = fileSize / (1024 * 1024);
        if (sizeFilter === 'small') return mb < 1;
        if (sizeFilter === 'medium') return mb >= 1 && mb <= 5;
        if (sizeFilter === 'large') return mb > 5;
        return true;
    };

    // Filter by date
    const filterByDate = (timestamp?: string) => {
        if (dateFilter === 'all' || !timestamp) return true;
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (dateFilter === 'today') return diffDays === 0;
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
    };

    if (!isOpen) return null;

    // Filter messages by type with size, date, and search filters
    const mediaMessages = messages.filter(m =>
        m.message_type === 'image' || m.message_type === 'video'
    ).filter(m => {
        if (!searchQuery) return true;
        return m.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }).filter(m => filterBySize(m.file_size))
        .filter(m => filterByDate(m.created_at))
        .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

    const linkMessages = messages.filter(m =>
        m.message_type === 'text' && m.content?.match(URL_REGEX)
    );

    const docMessages = messages.filter(m =>
        m.message_type === 'file' || m.message_type === 'audio'
    ).filter(m => {
        if (!searchQuery) return true;
        return m.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }).filter(m => filterBySize(m.file_size))
        .filter(m => filterByDate(m.created_at))
        .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

    // Extract all links from messages
    const allLinks = linkMessages.flatMap(m =>
        (m.content?.match(URL_REGEX) || []).map(url => ({
            url,
            timestamp: m.created_at,
            messageId: m.id
        }))
    ).filter(link => {
        if (!searchQuery) return true;
        return link.url.toLowerCase().includes(searchQuery.toLowerCase());
    }).filter(link => filterByDate(link.timestamp));

    // Clear chat function
    const handleClearChat = (type: 'all' | 'media' | 'links' | 'docs') => {
        const downloadedFiles = JSON.parse(localStorage.getItem('downloadedFiles') || '{}');

        // Remove download records based on type
        if (type === 'all' || type === 'media') {
            mediaMessages.forEach(m => {
                if (m.file_id && downloadedFiles[m.file_id]) {
                    delete downloadedFiles[m.file_id];
                }
            });
        }
        if (type === 'all' || type === 'docs') {
            docMessages.forEach(m => {
                if (m.file_id && downloadedFiles[m.file_id]) {
                    delete downloadedFiles[m.file_id];
                }
            });
        }

        localStorage.setItem('downloadedFiles', JSON.stringify(downloadedFiles));
        setShowClearConfirm(false);
        // Note: Actual message deletion would require backend API call
    };

    const tabs: { id: TabType; label: string; count: number }[] = [
        { id: 'media', label: 'Media', count: mediaMessages.length },
        { id: 'links', label: 'Links', count: allLinks.length },
        { id: 'docs', label: 'Docs', count: docMessages.length },
    ];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '500px',
                    maxHeight: '80vh',
                    background: '#1e1e2e',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#fff', flex: 1 }}>
                        {contactName}
                    </span>

                    {/* Clear button */}
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Clear
                    </button>
                </div>

                {/* Search bar */}
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        gap: '10px'
                    }}>
                        <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '14px'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    padding: '2px'
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        {/* Filter toggle button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                background: showFilters ? 'rgba(99,102,241,0.3)' : 'none',
                                border: 'none',
                                color: showFilters ? '#6366f1' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                            </svg>
                        </button>
                    </div>

                    {/* Filter options dropdown */}
                    {showFilters && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginTop: '12px'
                        }}>
                            {/* Size filter */}
                            <select
                                value={sizeFilter}
                                onChange={(e) => setSizeFilter(e.target.value as any)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all" style={{ background: '#1e1e2e' }}>All sizes</option>
                                <option value="small" style={{ background: '#1e1e2e' }}>&lt; 1 MB</option>
                                <option value="medium" style={{ background: '#1e1e2e' }}>1-5 MB</option>
                                <option value="large" style={{ background: '#1e1e2e' }}>&gt; 5 MB</option>
                            </select>

                            {/* Date filter */}
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as any)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all" style={{ background: '#1e1e2e' }}>All time</option>
                                <option value="today" style={{ background: '#1e1e2e' }}>Today</option>
                                <option value="week" style={{ background: '#1e1e2e' }}>Last 7 days</option>
                                <option value="month" style={{ background: '#1e1e2e' }}>Last 30 days</option>
                            </select>

                            {/* Sort order */}
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as any)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="newest" style={{ background: '#1e1e2e' }}>Newest first</option>
                                <option value="oldest" style={{ background: '#1e1e2e' }}>Oldest first</option>
                            </select>

                            {/* Select mode toggle */}
                            <button
                                onClick={() => setSelectionMode(!selectionMode)}
                                style={{
                                    background: selectionMode ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid ' + (selectionMode ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.2)'),
                                    borderRadius: '8px',
                                    color: selectionMode ? '#6366f1' : '#fff',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    {selectionMode && <path d="M9 12l2 2 4-4" />}
                                </svg>
                                Select
                            </button>
                        </div>
                    )}
                </div>

                {/* Selection toolbar - shown when items are selected */}
                {selectionMode && selectedItems.size > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 20px',
                        background: 'rgba(99,102,241,0.1)',
                        borderBottom: '1px solid rgba(99,102,241,0.3)'
                    }}>
                        <span style={{ color: '#fff', fontSize: '14px' }}>
                            {selectedItems.size} selected
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Forward */}
                            <button
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title="Forward"
                            >
                                <img src="/src/assets/icons/share.png" alt="Forward" style={{ width: '16px', height: '16px' }} />
                            </button>
                            {/* Share */}
                            <button
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title="Share"
                            >
                                <img src="/src/assets/icons/share.png" alt="Share" style={{ width: '16px', height: '16px' }} />
                            </button>
                            {/* Delete */}
                            <button
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(239,68,68,0.2)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title="Delete"
                            >
                                <img src="/src/assets/icons/delete.png" alt="Delete" style={{ width: '16px', height: '16px' }} />
                            </button>
                            {/* Cancel */}
                            <button
                                onClick={clearSelection}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}


                {/* Clear confirmation modal */}
                {showClearConfirm && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}>
                        <div style={{
                            background: '#2a2a3a',
                            borderRadius: '16px',
                            padding: '24px',
                            width: '280px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '16px' }}>Clear Downloads?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
                                This will clear download history for {activeTab}. Files will need to be downloaded again.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleClearChat(activeTab)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === tab.id ? '#6366f1' : 'rgba(255,255,255,0.6)',
                                fontWeight: 500,
                                fontSize: '14px',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'color 0.2s'
                            }}
                        >
                            {tab.label} ({tab.count})
                            {activeTab === tab.id && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: '#6366f1',
                                    borderRadius: '3px 3px 0 0'
                                }} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px'
                }}>
                    {activeTab === 'media' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '4px'
                        }}>
                            {mediaMessages.length === 0 ? (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: 'rgba(255,255,255,0.5)'
                                }}>
                                    No media shared yet
                                </div>
                            ) : (
                                mediaMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        onClick={() => {
                                            if (selectionMode) {
                                                toggleSelection(msg.id);
                                            } else {
                                                if (msg.message_type === 'video') {
                                                    onVideoClick?.(msg.file_id!, msg.file_name || 'video');
                                                } else {
                                                    onImageClick?.(msg.file_id!, msg.file_name || 'image');
                                                }
                                            }
                                        }}
                                        style={{
                                            aspectRatio: '1',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            position: 'relative',
                                            border: selectedItems.has(msg.id) ? '3px solid #6366f1' : 'none'
                                        }}
                                    >
                                        {msg.message_type === 'video' ? (
                                            <>
                                                <video
                                                    src={`${API_URL}/api/files/${msg.file_id}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                    muted
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.3)'
                                                }}>
                                                    <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </>
                                        ) : (
                                            <img
                                                src={`${API_URL}/api/files/${msg.file_id}`}
                                                alt=""
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                                loading="lazy"
                                            />
                                        )}
                                        {/* Selection checkbox overlay */}
                                        {selectionMode && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '6px',
                                                left: '6px',
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                background: selectedItems.has(msg.id) ? '#6366f1' : 'rgba(0,0,0,0.5)',
                                                border: selectedItems.has(msg.id) ? 'none' : '2px solid rgba(255,255,255,0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedItems.has(msg.id) && (
                                                    <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {allLinks.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: 'rgba(255,255,255,0.5)'
                                }}>
                                    No links shared yet
                                </div>
                            ) : (
                                allLinks.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            color: '#fff',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <svg width="18" height="18" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                            </svg>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px',
                                                color: '#6366f1',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {link.url}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'rgba(255,255,255,0.4)',
                                                marginTop: '2px'
                                            }}>
                                                {new Date(link.timestamp).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <path d="M15 3h6v6M10 14L21 3" />
                                        </svg>
                                    </a>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'docs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {docMessages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: 'rgba(255,255,255,0.5)'
                                }}>
                                    No documents shared yet
                                </div>
                            ) : (
                                docMessages.map(msg => (
                                    <a
                                        key={msg.id}
                                        href={`${API_URL}/api/files/${msg.file_id}`}
                                        download={msg.file_name}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            color: '#fff',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: getFileColor(msg.file_name || ''),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>
                                                {getFileExtension(msg.file_name || '')}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {msg.file_name || 'Document'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'rgba(255,255,255,0.4)',
                                                marginTop: '2px'
                                            }}>
                                                {formatFileSize(msg.file_size)} • {new Date(msg.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                        </svg>
                                    </a>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper functions
function getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return ext.slice(0, 4);
}

function getFileColor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const colors: Record<string, string> = {
        pdf: 'rgba(239, 68, 68, 0.3)',
        doc: 'rgba(59, 130, 246, 0.3)',
        docx: 'rgba(59, 130, 246, 0.3)',
        xls: 'rgba(34, 197, 94, 0.3)',
        xlsx: 'rgba(34, 197, 94, 0.3)',
        ppt: 'rgba(249, 115, 22, 0.3)',
        pptx: 'rgba(249, 115, 22, 0.3)',
        zip: 'rgba(168, 85, 247, 0.3)',
        rar: 'rgba(168, 85, 247, 0.3)',
    };
    return colors[ext] || 'rgba(99, 102, 241, 0.3)';
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
