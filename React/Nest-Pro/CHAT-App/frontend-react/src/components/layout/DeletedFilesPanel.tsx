import { useState, useEffect } from 'react';

const API_URL = 'http://127.0.0.1:8000';

interface DeletedFile {
    file_id: string;
    deleted_at: string;
    permanent_delete_at: string;
    filename?: string;
    file_type?: string;
}

export function DeletedFilesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [deletedFiles, setDeletedFiles] = useState<DeletedFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all');

    useEffect(() => {
        if (isOpen) {
            loadDeletedFiles();
        }
    }, [isOpen]);

    const loadDeletedFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/files/deleted`);
            const data = await res.json();
            setDeletedFiles(data.files || []);
        } catch (error) {
            console.error('Failed to load deleted files:', error);
        } finally {
            setLoading(false);
        }
    };

    const restoreFile = async (fileId: string) => {
        try {
            await fetch(`${API_URL}/api/files/${fileId}/restore`, { method: 'POST' });
            setDeletedFiles(prev => prev.filter(f => f.file_id !== fileId));
        } catch (error) {
            console.error('Failed to restore file:', error);
        }
    };

    const getDaysRemaining = (permanentDeleteAt: string) => {
        const diff = new Date(permanentDeleteAt).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const filteredFiles = deletedFiles.filter(f => {
        if (filter === 'all') return true;
        const type = f.file_type || '';
        if (filter === 'images') return type.startsWith('image/');
        if (filter === 'videos') return type.startsWith('video/');
        if (filter === 'documents') return type.includes('document') || type.includes('pdf') || type.includes('word');
        return true;
    });

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px',
            background: '#1a1a2e', borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000, display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Deleted Files</h3>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px'
                }}>×</button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {(['all', 'images', 'videos', 'documents'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '6px 12px', borderRadius: '16px', border: 'none',
                        background: filter === f ? '#6366f1' : 'rgba(255,255,255,0.1)',
                        color: filter === f ? '#fff' : '#888', cursor: 'pointer', fontSize: '12px',
                        textTransform: 'capitalize'
                    }}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Info Banner */}
            <div style={{
                padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444', fontSize: '12px', lineHeight: 1.4
            }}>
                ⚠️ Files are permanently deleted after 30 days. Restore them before they expire.
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Loading...</div>
                ) : filteredFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                        <p>No deleted files</p>
                        <p style={{ fontSize: '12px' }}>Deleted files will appear here for 30 days</p>
                    </div>
                ) : (
                    filteredFiles.map(file => (
                        <div key={file.file_id} style={{
                            display: 'flex', alignItems: 'center', padding: '12px',
                            background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px'
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.1)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', marginRight: '12px'
                            }}>
                                📄
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#fff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.filename || file.file_id.slice(0, 12)}
                                </div>
                                <div style={{ color: '#888', fontSize: '11px' }}>
                                    {getDaysRemaining(file.permanent_delete_at)} days remaining
                                </div>
                            </div>
                            <button onClick={() => restoreFile(file.file_id)} style={{
                                background: '#10b981', border: 'none', color: '#fff',
                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                            }}>
                                Restore
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
