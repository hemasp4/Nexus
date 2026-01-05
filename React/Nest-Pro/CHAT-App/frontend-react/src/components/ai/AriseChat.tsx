import { useAriseStore } from '../../stores/ariseStore';
import { useAuthStore } from '../../stores/authStore';
import { useState, useRef, useEffect } from 'react';

export function AriseChat() {
    const {
        currentConversation,
        isLoading,
        sendMessage,
        selectedModel,
        setModel,
        models,
        attachedFiles,
        addFile,
        removeFile,
    } = useAriseStore();
    const { user } = useAuthStore();
    const [input, setInput] = useState('');
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentConversation?.messages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const content = input;
        setInput('');
        await sendMessage(content);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/') || item.kind === 'file') {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) addFile(file);
                return;
            }
        }
    };

    const currentModel = models.find(m => m.id === selectedModel);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'linear-gradient(180deg, #0f0f17 0%, #1a1a2e 100%)',
            position: 'relative'
        }}>
            {/* Minimal Header */}
            <div style={{
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <button
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)'
                    }} />
                    {currentModel?.name || 'Gemini Pro'}
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showModelMenu && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        background: '#1e1e2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '8px',
                        minWidth: '220px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        zIndex: 100
                    }}>
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => { setModel(model.id); setShowModelMenu(false); }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: model.id === selectedModel ? 'rgba(99,102,241,0.2)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500 }}>{model.name}</div>
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{model.provider}</div>
                                </div>
                                {model.id === selectedModel && (
                                    <svg width="16" height="16" fill="#22c55e" viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 0'
            }}>
                <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 24px' }}>
                    {!currentConversation || currentConversation.messages.length === 0 ? (
                        <WelcomeScreen onSuggestionClick={(text) => setInput(text)} />
                    ) : (
                        currentConversation.messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                gap: '12px',
                                marginBottom: '24px',
                                animation: 'fadeInUp 0.3s ease'
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {msg.role === 'user' ? (
                                        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>
                                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    ) : (
                                        <svg width="16" height="16" fill="#fff" viewBox="0 0 24 24">
                                            <path d="M12 2L1 7l11 5 11-5-11-5zM1 17l11 5 11-5M1 12l11 5 11-5" />
                                        </svg>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div style={{
                                    maxWidth: '75%',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                        : 'rgba(255,255,255,0.05)',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    padding: '14px 18px'
                                }}>
                                    {msg.role === 'user' ? (
                                        <div style={{
                                            color: '#fff',
                                            fontSize: '15px',
                                            lineHeight: 1.6
                                        }}>{msg.content}</div>
                                    ) : (
                                        <MessageContent content={msg.content} />
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24">
                                    <path d="M12 2L1 7l11 5 11-5-11-5zM1 17l11 5 11-5M1 12l11 5 11-5" />
                                </svg>
                            </div>
                            <div style={{ paddingTop: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#22c55e',
                                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* File Previews */}
            {attachedFiles.length > 0 && (
                <div style={{
                    maxWidth: '768px',
                    margin: '0 auto',
                    padding: '0 24px 12px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    {attachedFiles.map((file, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '8px 12px'
                        }}>
                            <span style={{ color: '#888', fontSize: '13px' }}>{file.name}</span>
                            <button
                                onClick={() => removeFile(idx)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '2px'
                                }}
                            >×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area - ChatGPT Style */}
            <div style={{
                padding: '16px 24px 24px',
                background: 'transparent'
            }}>
                <div style={{
                    maxWidth: '768px',
                    margin: '0 auto',
                    position: 'relative'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        transition: 'all 0.2s'
                    }}>
                        {/* Attach Button with Popup Menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAttachMenu(!showAttachMenu)}
                                style={{
                                    background: showAttachMenu ? 'rgba(255,255,255,0.1)' : 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </button>

                            {/* File Type Popup Menu */}
                            {showAttachMenu && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: 0,
                                    marginBottom: '8px',
                                    background: '#1e1e2e',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    minWidth: '180px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                    zIndex: 100
                                }}>
                                    {/* Photos & Videos */}
                                    <button
                                        onClick={() => {
                                            fileInputRef.current!.accept = 'image/*,video/*';
                                            fileInputRef.current!.click();
                                            setShowAttachMenu(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span>Photos & Videos</span>
                                    </button>

                                    {/* Documents */}
                                    <button
                                        onClick={() => {
                                            fileInputRef.current!.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                                            fileInputRef.current!.click();
                                            setShowAttachMenu(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span>Documents</span>
                                    </button>

                                    {/* Camera */}
                                    <button
                                        onClick={() => {
                                            cameraInputRef.current!.click();
                                            setShowAttachMenu(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                        </div>
                                        <span>Camera</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Hidden File Inputs */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            multiple
                            onChange={(e) => {
                                Array.from(e.target.files || []).forEach(f => addFile(f));
                                e.target.value = '';
                            }}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                Array.from(e.target.files || []).forEach(f => addFile(f));
                                e.target.value = '';
                            }}
                        />


                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder="Message Gemini..."
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '15px',
                                resize: 'none',
                                lineHeight: 1.5,
                                maxHeight: '200px',
                                fontFamily: 'inherit'
                            }}
                            rows={1}
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: input.trim() && !isLoading
                                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                    : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    </div>

                    <p style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '12px',
                        marginTop: '12px'
                    }}>
                        Gemini can make mistakes. Check important info.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
    const suggestions = [
        { icon: '💡', title: 'Explain quantum computing', subtitle: 'in simple terms' },
        { icon: '✍️', title: 'Write a creative story', subtitle: 'about a space explorer' },
        { icon: '📊', title: 'Analyze data trends', subtitle: 'for business insights' },
        { icon: '🧠', title: 'Brainstorm ideas', subtitle: 'for a mobile app' },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center'
        }}>
            {/* Logo */}
            <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
            }}>
                <svg width="36" height="36" fill="#fff" viewBox="0 0 24 24">
                    <path d="M12 2L1 7l11 5 11-5-11-5zM1 17l11 5 11-5M1 12l11 5 11-5" />
                </svg>
            </div>

            <h1 style={{
                fontSize: '32px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '8px'
            }}>
                How can I help you today?
            </h1>
            <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '16px',
                marginBottom: '40px'
            }}>
                Powered by Google Gemini
            </p>

            {/* Suggestions Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                maxWidth: '480px',
                width: '100%'
            }}>
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => onSuggestionClick(s.title + ' ' + s.subtitle)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        <span style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</span>
                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{s.title}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{s.subtitle}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// MessageContent component with code blocks and action icons
function MessageContent({ content }: { content: string }) {
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    // Parse code blocks
    const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'code', content: match[2], language: match[1] || 'code' });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
        parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    const copyToClipboard = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    return (
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: 1.7 }}>
            {parts.map((part, idx) => (
                part.type === 'code' ? (
                    <div key={idx} style={{
                        background: '#0d0d14',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        margin: '12px 0',
                        overflow: 'hidden'
                    }}>
                        {/* Header with language and actions */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '12px',
                                textTransform: 'lowercase'
                            }}>
                                {part.language}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {/* Copy */}
                                <button
                                    onClick={() => copyToClipboard(part.content, idx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: copiedIdx === idx ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px'
                                    }}
                                    title="Copy code"
                                >
                                    {copiedIdx === idx ? (
                                        <>
                                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                    )}
                                </button>
                                {/* Share */}
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ text: part.content });
                                        } else {
                                            copyToClipboard(part.content, idx);
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                    title="Share"
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <circle cx="18" cy="5" r="3" />
                                        <circle cx="6" cy="12" r="3" />
                                        <circle cx="18" cy="19" r="3" />
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                    </svg>
                                </button>
                                {/* Edit (copy to input) */}
                                <button
                                    onClick={() => copyToClipboard(part.content, idx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                    title="Edit"
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {/* Code content */}
                        <pre style={{
                            margin: 0,
                            padding: '16px',
                            overflow: 'auto',
                            fontSize: '13px',
                            fontFamily: "'Fira Code', 'Consolas', monospace",
                            color: '#e2e8f0'
                        }}>
                            <code>{part.content}</code>
                        </pre>
                    </div>
                ) : (
                    <span key={idx} dangerouslySetInnerHTML={{
                        __html: formatText(part.content)
                    }} />
                )
            ))}
        </div>
    );
}

function formatText(content: string): string {
    return content
        // Inline code
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:13px;font-family:monospace">$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

function formatAIResponse(content: string): string {
    return content
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:#1a1a2e;padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0"><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

