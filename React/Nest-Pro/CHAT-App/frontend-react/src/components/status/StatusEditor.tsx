import { useRef, useState, useEffect, useCallback } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    fontFamily: string;
    fontSize: number;
    color: string;
    isDragging?: boolean;
}

interface EmojiOverlay {
    id: string;
    emoji: string;
    x: number;
    y: number;
    size: number;
    isDragging?: boolean;
}

interface DrawAction {
    type: 'draw';
    points: { x: number; y: number }[];
    color: string;
    brushSize: number;
}

type HistoryAction =
    | { type: 'draw'; data: DrawAction }
    | { type: 'text'; data: TextOverlay }
    | { type: 'emoji'; data: EmojiOverlay };

interface StatusEditorProps {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    onSave: (canvas: HTMLCanvasElement, overlays: { texts: TextOverlay[]; emojis: EmojiOverlay[] }) => void;
    onClose: () => void;
}

const COLORS = ['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'];
const FONT_SIZES = [16, 20, 24, 28, 32, 40, 48, 60];

export function StatusEditor({ mediaUrl, mediaType, onSave, onClose }: StatusEditorProps) {
    const [activeTool, setActiveTool] = useState<'draw' | 'text' | 'emoji' | null>(null);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(4);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [emojiOverlays, setEmojiOverlays] = useState<EmojiOverlay[]>([]);
    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [showTextModal, setShowTextModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [newText, setNewText] = useState('');
    const [newTextFont, setNewTextFont] = useState('Arial');
    const [newTextSize, setNewTextSize] = useState(24);
    const [newTextColor, setNewTextColor] = useState('#ffffff');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const [drawPaths, setDrawPaths] = useState<DrawAction[]>([]);
    const [dragTarget, setDragTarget] = useState<{ type: 'text' | 'emoji'; id: string } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Draw on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw all paths
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawPaths.forEach(path => {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            path.points.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        });

        // Draw current path
        if (currentPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            currentPath.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        }
    }, [drawPaths, currentPath, brushColor, brushSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'draw') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setCurrentPath([{ x, y }]);
    }, [activeTool]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || activeTool !== 'draw') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentPath(prev => [...prev, { x, y }]);
    }, [isDrawing, activeTool]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing) return;

        if (currentPath.length > 0) {
            const newPath: DrawAction = {
                type: 'draw',
                points: currentPath,
                color: brushColor,
                brushSize,
            };
            setDrawPaths(prev => [...prev, newPath]);
            setHistory(prev => [...prev, { type: 'draw', data: newPath }]);
        }

        setIsDrawing(false);
        setCurrentPath([]);
    }, [isDrawing, currentPath, brushColor, brushSize]);

    const handleAddText = () => {
        if (!newText.trim()) return;

        const container = containerRef.current;
        const newOverlay: TextOverlay = {
            id: `text-${Date.now()}`,
            text: newText,
            x: container ? container.clientWidth / 2 - 50 : 100,
            y: container ? container.clientHeight / 2 : 200,
            fontFamily: newTextFont,
            fontSize: newTextSize,
            color: newTextColor,
        };

        setTextOverlays(prev => [...prev, newOverlay]);
        setHistory(prev => [...prev, { type: 'text', data: newOverlay }]);
        setNewText('');
        setShowTextModal(false);
        setActiveTool(null);
    };

    const handleAddEmoji = (emojiData: { emoji: string }) => {
        const container = containerRef.current;
        const newOverlay: EmojiOverlay = {
            id: `emoji-${Date.now()}`,
            emoji: emojiData.emoji,
            x: container ? container.clientWidth / 2 - 20 : 100,
            y: container ? container.clientHeight / 2 : 200,
            size: 40,
        };

        setEmojiOverlays(prev => [...prev, newOverlay]);
        setHistory(prev => [...prev, { type: 'emoji', data: newOverlay }]);
        setShowEmojiPicker(false);
        setActiveTool(null);
    };

    const handleUndo = () => {
        if (history.length === 0) return;

        const lastAction = history[history.length - 1];

        if (lastAction.type === 'draw') {
            setDrawPaths(prev => prev.slice(0, -1));
        } else if (lastAction.type === 'text') {
            setTextOverlays(prev => prev.filter(t => t.id !== lastAction.data.id));
        } else if (lastAction.type === 'emoji') {
            setEmojiOverlays(prev => prev.filter(e => e.id !== lastAction.data.id));
        }

        setHistory(prev => prev.slice(0, -1));
    };

    const handleClearAll = () => {
        if (confirm('Clear all edits?')) {
            setDrawPaths([]);
            setTextOverlays([]);
            setEmojiOverlays([]);
            setHistory([]);
        }
    };

    // Drag handlers for overlays
    const startDrag = (type: 'text' | 'emoji', id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const overlay = type === 'text'
            ? textOverlays.find(t => t.id === id)
            : emojiOverlays.find(em => em.id === id);

        if (overlay) {
            setDragTarget({ type, id });
            setDragOffset({
                x: e.clientX - overlay.x,
                y: e.clientY - overlay.y,
            });
        }
    };

    const handleContainerMouseMove = (e: React.MouseEvent) => {
        if (!dragTarget) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        if (dragTarget.type === 'text') {
            setTextOverlays(prev => prev.map(t =>
                t.id === dragTarget.id ? { ...t, x: newX, y: newY } : t
            ));
        } else {
            setEmojiOverlays(prev => prev.map(em =>
                em.id === dragTarget.id ? { ...em, x: newX, y: newY } : em
            ));
        }
    };

    const handleContainerMouseUp = () => {
        setDragTarget(null);
    };

    const handleSave = async () => {
        onSave(canvasRef.current!, { texts: textOverlays, emojis: emojiOverlays });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed', inset: 0, background: '#000', zIndex: 1000,
                display: 'flex', flexDirection: 'column'
            }}
            onMouseMove={handleContainerMouseMove}
            onMouseUp={handleContainerMouseUp}
        >
            {/* Top Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', background: 'rgba(0,0,0,0.8)'
            }}>
                <button onClick={onClose} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6l12 12" /></svg>
                </button>

                {/* Tool buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ToolButton
                        icon="draw"
                        active={activeTool === 'draw'}
                        onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')}
                    />
                    <ToolButton
                        icon="text"
                        active={activeTool === 'text'}
                        onClick={() => { setActiveTool('text'); setShowTextModal(true); }}
                    />
                    <ToolButton
                        icon="emoji"
                        active={activeTool === 'emoji'}
                        onClick={() => { setActiveTool('emoji'); setShowEmojiPicker(true); }}
                    />
                    <ToolButton icon="undo" onClick={handleUndo} disabled={history.length === 0} />
                    <ToolButton icon="delete" onClick={handleClearAll} />
                </div>

                <div style={{ width: '40px' }} />
            </div>

            {/* Color & Brush Size (when drawing) */}
            {activeTool === 'draw' && (
                <div style={{
                    position: 'absolute', right: '16px', top: '80px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    background: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: '12px 8px'
                }}>
                    {COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => setBrushColor(color)}
                            style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: color,
                                border: brushColor === color ? '2px solid #6366f1' : '2px solid transparent',
                                cursor: 'pointer',
                                boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px #333' : 'none'
                            }}
                        />
                    ))}
                    <div style={{ width: '2px', height: '60px', background: 'rgba(255,255,255,0.3)', margin: '8px 0' }}>
                        <input
                            type="range"
                            min="2"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            style={{
                                writingMode: 'vertical-lr' as any,
                                direction: 'rtl',
                                width: '60px',
                                height: '4px',
                                transform: 'rotate(180deg)',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Background media */}
                {mediaType === 'video' ? (
                    <video src={mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                    <img src={mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}

                {/* Drawing canvas overlay */}
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        cursor: activeTool === 'draw' ? 'crosshair' : 'default',
                        pointerEvents: activeTool === 'draw' ? 'auto' : 'none'
                    }}
                />

                {/* Text overlays */}
                {textOverlays.map(overlay => (
                    <div
                        key={overlay.id}
                        onMouseDown={(e) => startDrag('text', overlay.id, e)}
                        style={{
                            position: 'absolute',
                            left: overlay.x,
                            top: overlay.y,
                            fontFamily: overlay.fontFamily,
                            fontSize: `${overlay.fontSize}px`,
                            color: overlay.color,
                            cursor: 'move',
                            userSelect: 'none',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px'
                        }}
                    >
                        {overlay.text}
                    </div>
                ))}

                {/* Emoji overlays */}
                {emojiOverlays.map(overlay => (
                    <div
                        key={overlay.id}
                        onMouseDown={(e) => startDrag('emoji', overlay.id, e)}
                        style={{
                            position: 'absolute',
                            left: overlay.x,
                            top: overlay.y,
                            fontSize: `${overlay.size}px`,
                            cursor: 'move',
                            userSelect: 'none'
                        }}
                    >
                        {overlay.emoji}
                    </div>
                ))}
            </div>

            {/* Caption Input */}
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Add a caption..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '24px',
                            padding: '12px 20px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                    <button onClick={handleSave} style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6366f1', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                    </button>
                </div>
            </div>

            {/* Text Modal */}
            {showTextModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ color: '#fff', margin: 0 }}>Add Text</h3>
                            <button onClick={() => { setShowTextModal(false); setActiveTool(null); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>×</button>
                        </div>

                        <textarea
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="Enter your text..."
                            style={{
                                width: '100%',
                                height: '100px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                resize: 'none',
                                outline: 'none',
                                marginBottom: '16px'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <select
                                value={newTextFont}
                                onChange={(e) => setNewTextFont(e.target.value)}
                                style={{ flex: 1, background: '#2a2a3e', border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', cursor: 'pointer' }}
                            >
                                {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                            </select>
                            <select
                                value={newTextSize}
                                onChange={(e) => setNewTextSize(parseInt(e.target.value))}
                                style={{ width: '100px', background: '#2a2a3e', border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', cursor: 'pointer' }}
                            >
                                {FONT_SIZES.map(size => <option key={size} value={size}>{size}px</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setNewTextColor(color)}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: color,
                                        border: newTextColor === color ? '3px solid #6366f1' : '2px solid transparent',
                                        cursor: 'pointer',
                                        boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px #333' : 'none'
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleAddText}
                            disabled={!newText.trim()}
                            style={{
                                width: '100%', padding: '14px',
                                background: newText.trim() ? '#6366f1' : '#333',
                                border: 'none', borderRadius: '12px',
                                color: '#fff', fontSize: '16px', fontWeight: 600,
                                cursor: newText.trim() ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Add Text
                        </button>
                    </div>
                </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => { setShowEmojiPicker(false); setActiveTool(null); }}
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '24px' }}
                        >
                            ×
                        </button>
                        <EmojiPicker onEmojiClick={handleAddEmoji} theme={Theme.DARK} />
                    </div>
                </div>
            )}
        </div>
    );
}

// Tool button component
function ToolButton({ icon, active, onClick, disabled }: { icon: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
    const icons: Record<string, React.ReactNode> = {
        draw: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
        text: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>,
        emoji: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>,
        undo: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>,
        delete: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '40px', height: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '50%',
                color: disabled ? '#555' : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1
            }}
        >
            {icons[icon]}
        </button>
    );
}
