import React, { useState, useRef } from 'react';
import { useStatusStore } from '../../stores/statusStore';
import { StatusEditor } from './StatusEditor';

const API_URL = 'http://127.0.0.1:8000';

interface CreateStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateStatusModal({ isOpen, onClose }: CreateStatusModalProps) {
    const [mode, setMode] = useState<'select' | 'text' | 'preview' | 'edit'>('select');
    const [textContent, setTextContent] = useState('');
    const [bgColor, setBgColor] = useState('#6366f1');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [caption, setCaption] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { createStatus } = useStatusStore();

    const bgColors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'];

    const handleFileSelect = (type: 'photo' | 'video') => {
        const input = fileInputRef.current;
        if (input) {
            input.accept = type === 'photo' ? 'image/*' : 'video/*';
            input.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            // Go to edit mode for editing tools (draw, text, emoji)
            setMode('edit');
            setError('');
        }
    };

    const handleTextSubmit = async () => {
        if (!textContent.trim()) return;
        setIsUploading(true);
        setError('');
        try {
            const success = await createStatus({ content: textContent, background_color: bgColor });
            if (success) {
                handleClose();
            } else {
                setError('Failed to create status');
            }
        } catch (err) {
            console.error('Failed to create status:', err);
            setError('Failed to create status');
        }
        setIsUploading(false);
    };

    const handleMediaSubmit = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadRes = await fetch(`${API_URL}/api/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!uploadRes.ok) {
                throw new Error(`Upload failed: ${uploadRes.status}`);
            }

            const uploadData = await uploadRes.json();
            const fileId = uploadData.file_id;
            const mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';

            const success = await createStatus({
                media_id: fileId,
                media_type: mediaType,
                content: caption || undefined
            });
            if (success) {
                handleClose();
            } else {
                setError('Failed to create status');
            }
        } catch (err) {
            console.error('Failed to create status:', err);
            setError('Failed to upload file');
        }
        setIsUploading(false);
    };

    const handleEditorSave = async (_canvas: HTMLCanvasElement, _overlays: { texts: any[]; emojis: any[] }) => {
        // For now, just submit the original file
        // TODO: Merge canvas with overlays onto the image/video
        await handleMediaSubmit();
    };

    const handleClose = () => {
        setMode('select');
        setTextContent('');
        setSelectedFile(null);
        setPreviewUrl('');
        setBgColor('#6366f1');
        setCaption('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    // Show full-screen editor when editing media
    if (mode === 'edit' && selectedFile && previewUrl) {
        return (
            <StatusEditor
                mediaUrl={previewUrl}
                mediaType={selectedFile.type.startsWith('video') ? 'video' : 'image'}
                onSave={handleEditorSave}
                onClose={() => { setMode('select'); setSelectedFile(null); setPreviewUrl(''); }}
            />
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }} onClick={handleClose}>
            <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '24px', minWidth: '360px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>

                {/* Error Display */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', marginBottom: '16px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* Selection Mode */}
                {mode === 'select' && (
                    <>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', textAlign: 'center', marginBottom: '24px' }}>Create Status</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                            <OptionButton icon="text" label="Text" onClick={() => setMode('text')} />
                            <OptionButton icon="photo" label="Photo" onClick={() => handleFileSelect('photo')} />
                            <OptionButton icon="video" label="Video" onClick={() => handleFileSelect('video')} />
                        </div>
                        <button onClick={handleClose} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                    </>
                )}

                {/* Text Mode */}
                {mode === 'text' && (
                    <>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', textAlign: 'center', marginBottom: '20px' }}>Text Status</h2>

                        {/* Preview */}
                        <div style={{ padding: '24px', background: bgColor, borderRadius: '12px', marginBottom: '16px', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#fff', textAlign: 'center', margin: 0 }}>{textContent || 'Your status here...'}</p>
                        </div>

                        {/* Color picker */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                            {bgColors.map((color) => (
                                <button key={color} onClick={() => setBgColor(color)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: bgColor === color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                            ))}
                        </div>

                        <textarea
                            style={{ width: '100%', minHeight: '80px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', resize: 'none', marginBottom: '16px' }}
                            placeholder="What's on your mind?"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            autoFocus
                        />

                        <button onClick={handleTextSubmit} disabled={isUploading || !textContent.trim()} style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px', opacity: isUploading || !textContent.trim() ? 0.5 : 1 }}>
                            {isUploading ? 'Posting...' : 'Post Status'}
                        </button>
                        <button onClick={() => setMode('select')} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Back</button>
                    </>
                )}

                {/* Preview Mode (fallback without editor) */}
                {mode === 'preview' && selectedFile && (
                    <>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', textAlign: 'center', marginBottom: '20px' }}>Preview</h2>
                        <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selectedFile.type.startsWith('video') ? (
                                <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '280px' }} />
                            ) : (
                                <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }} />
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Add a caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', marginBottom: '16px', outline: 'none' }}
                        />
                        <button onClick={handleMediaSubmit} disabled={isUploading} style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px', opacity: isUploading ? 0.5 : 1 }}>
                            {isUploading ? 'Uploading...' : 'Post Status'}
                        </button>
                        <button onClick={() => { setMode('select'); setSelectedFile(null); setPreviewUrl(''); }} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Back</button>
                    </>
                )}

                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
        </div>
    );
}

// Option button component
function OptionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    const icons: Record<string, React.ReactNode> = {
        text: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
        photo: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
        video: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
    };

    return (
        <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid transparent', borderRadius: '12px', cursor: 'pointer', width: '90px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}>
            <div style={{ color: '#6366f1' }}>{icons[icon]}</div>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{label}</span>
        </button>
    );
}
