import { useState, useRef, useEffect } from 'react';

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string;
    fileName: string;
    fileType: 'image' | 'video';
    onReply?: () => void;
    onForward?: () => void;
    onShare?: () => void;
    onSaveAs?: () => void;
    autoSaveEnabled?: boolean;
}

const API_URL = 'http://127.0.0.1:8000';

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function Lightbox({ isOpen, onClose, fileId, fileName, fileType, onReply, onForward, onShare, onSaveAs, autoSaveEnabled = false }: LightboxProps) {
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [copied, setCopied] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const fileUrl = `${API_URL}/api/files/${fileId}`;

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setIsPlaying(false);
            setProgress(0);
            setPlaybackSpeed(1);
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, fileId]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === ' ' && fileType === 'video') { e.preventDefault(); togglePlay(); }
            if (e.key === 'm') toggleMute();
            if (e.key === 'f') toggleFullscreen();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, fileType]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = volume;
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [isMuted, volume, playbackSpeed]);

    const handleDownload = async () => {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopy = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            if (fileType === 'image' && navigator.clipboard.write) {
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            } else {
                await navigator.clipboard.writeText(fileUrl);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            await navigator.clipboard.writeText(fileUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => setIsMuted(!isMuted);

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoRef.current.requestFullscreen();
        }
    };

    const togglePictureInPicture = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (err) {
            console.error('PiP error:', err);
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = percent * videoRef.current.duration;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    const btnStyle: React.CSSProperties = {
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#6366f1', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', transition: 'transform 0.2s',
    };

    const controlBtnStyle: React.CSSProperties = {
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>

            {/* Header */}
            <div style={{ position: 'absolute', top: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(30, 30, 40, 0.9)', borderRadius: '50px', backdropFilter: 'blur(10px)', zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />

                {/* Reply */}
                {onReply && (
                    <button onClick={() => { onReply(); onClose(); }} style={btnStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Reply">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                    </button>
                )}

                {/* Forward */}
                {onForward && (
                    <button onClick={() => { onForward(); onClose(); }} style={btnStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Forward">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                    </button>
                )}

                {/* Share */}
                {onShare && (
                    <button onClick={onShare} style={btnStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Share">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                    </button>
                )}

                {/* Save As (when auto-save is OFF) or Download (when auto-save is ON) */}
                {!autoSaveEnabled && onSaveAs ? (
                    <button onClick={onSaveAs} style={btnStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Save as...">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    </button>
                ) : (
                    <button onClick={handleDownload} style={btnStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Download">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </button>
                )}

                {/* Close */}
                <button onClick={onClose} style={{ ...controlBtnStyle, marginLeft: '4px' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} title="Close (Esc)">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#fff' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Loading...
                </div>
            )}

            {/* Image Content */}
            {fileType === 'image' && (
                <img src={fileUrl} alt={fileName} onClick={(e) => e.stopPropagation()} onLoad={() => setLoading(false)} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }} />
            )}

            {/* Video Content */}
            {fileType === 'video' && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '95vw', maxHeight: '90vh' }}>
                    <video
                        ref={videoRef}
                        src={fileUrl}
                        onClick={togglePlay}
                        onLoadedMetadata={() => { setLoading(false); setDuration(videoRef.current?.duration || 0); }}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        style={{ maxWidth: '95vw', maxHeight: '80vh', borderRadius: '8px', opacity: loading ? 0 : 1, cursor: 'pointer' }}
                    />

                    {/* Video Controls */}
                    {!loading && (
                        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'rgba(0, 0, 0, 0.8)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            {/* Play/Pause */}
                            <button onClick={togglePlay} style={{ ...controlBtnStyle, background: '#6366f1' }}>
                                {isPlaying ? (
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                                ) : (
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                            </button>

                            {/* Time */}
                            <span style={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace', minWidth: '40px' }}>{formatTime(currentTime)}</span>

                            {/* Progress */}
                            <div onClick={handleSeek} style={{ width: '180px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', cursor: 'pointer', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }} />
                            </div>

                            {/* Duration */}
                            <span style={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace', minWidth: '40px' }}>{formatTime(duration)}</span>

                            {/* Volume */}
                            <div style={{ position: 'relative' }} onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                                <button onClick={toggleMute} style={controlBtnStyle}>
                                    {isMuted || volume === 0 ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                    )}
                                </button>
                                {showVolumeSlider && (
                                    <div style={{ position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)', padding: '12px 8px', background: 'rgba(0,0,0,0.9)', borderRadius: '8px' }}>
                                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); if (parseFloat(e.target.value) > 0) setIsMuted(false); }} style={{ width: '80px', height: '100px', writingMode: 'vertical-lr', direction: 'rtl', cursor: 'pointer', accentColor: '#6366f1' }} />
                                    </div>
                                )}
                            </div>

                            {/* Playback Speed */}
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} style={controlBtnStyle} title="Playback Speed">
                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{playbackSpeed}x</span>
                                </button>
                                {showSpeedMenu && (
                                    <div style={{ position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)', padding: '8px', background: 'rgba(0,0,0,0.9)', borderRadius: '8px', minWidth: '80px' }}>
                                        {playbackSpeeds.map((speed) => (
                                            <button key={speed} onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: speed === playbackSpeed ? '#6366f1' : 'transparent', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Picture in Picture */}
                            <button onClick={togglePictureInPicture} style={controlBtnStyle} title="Picture in Picture">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><rect x="11" y="10" width="9" height="7" rx="1" /></svg>
                            </button>

                            {/* Fullscreen */}
                            <button onClick={toggleFullscreen} style={controlBtnStyle} title="Fullscreen">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Play overlay */}
                    {!isPlaying && !loading && (
                        <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <div style={{ width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.9)', borderRadius: '50%' }}>
                                <svg width="32" height="32" fill="#fff" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
