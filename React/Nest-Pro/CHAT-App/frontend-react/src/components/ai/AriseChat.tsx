import { useAriseStore } from '../../stores/ariseStore';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

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
        clearFiles
    } = useAriseStore();
    const { user } = useAuthStore();
    const [input, setInput] = useState('');
    const [showModelMenu, setShowModelMenu] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
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
        <div className="chat-area arise-chat-area">
            {/* Header with Model Selector */}
            <header className="chat-header arise-header">
                <div className="model-selector">
                    <button
                        className="model-btn"
                        onClick={() => setShowModelMenu(!showModelMenu)}
                    >
                        <span>{currentModel?.name || 'Select Model'}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showModelMenu && (
                        <div className="model-menu active">
                            {models.map((model) => (
                                <button
                                    key={model.id}
                                    className={`model-option ${model.id === selectedModel ? 'selected' : ''}`}
                                    onClick={() => {
                                        setModel(model.id);
                                        setShowModelMenu(false);
                                    }}
                                >
                                    <span>{model.name}</span>
                                    <span className="model-provider">{model.provider}</span>
                                    {model.id === selectedModel && (
                                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div className="messages-container arise-messages">
                {!currentConversation || currentConversation.messages.length === 0 ? (
                    <WelcomeScreen onSuggestionClick={(text) => { setInput(text); handleSend(); }} />
                ) : (
                    currentConversation.messages.map((msg, idx) => (
                        <div key={idx} className={`arise-message ${msg.role}`}>
                            <div className="arise-message-avatar">
                                {msg.role === 'user' ? (
                                    <div className="avatar-placeholder">{user?.username?.charAt(0) || 'U'}</div>
                                ) : (
                                    <div className="ai-avatar">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="arise-message-content">
                                {msg.role === 'user' ? msg.content : formatAIResponse(msg.content)}
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="arise-message assistant">
                        <div className="arise-message-avatar">
                            <div className="ai-avatar">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="arise-message-content">
                            <div className="loader-dots"><span></span><span></span><span></span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* File Previews */}
            {attachedFiles.length > 0 && (
                <div className="file-preview-container">
                    {attachedFiles.map((file, idx) => (
                        <FilePreview key={idx} file={file} onRemove={() => removeFile(idx)} />
                    ))}
                </div>
            )}

            {/* Input */}
            <footer className="message-input-container arise-input">
                <div className="message-input-wrapper">
                    <button className="icon-btn" onClick={() => document.getElementById('ariseFileInput')?.click()}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <input type="file" id="ariseFileInput" className="hidden" multiple onChange={(e) => {
                        Array.from(e.target.files || []).forEach(f => addFile(f));
                    }} />

                    <textarea
                        className="message-input"
                        placeholder="Ask anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        rows={1}
                    />

                    <button
                        className="btn-primary send-btn"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </footer>
        </div>
    );
}

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
    const suggestions = [
        { emoji: '💡', text: 'Explain quantum computing' },
        { emoji: '🧠', text: 'Brainstorm project ideas' },
        { emoji: '✉️', text: 'Write a professional email' },
        { emoji: '📊', text: 'Summarize tech trends' },
    ];

    return (
        <div className="arise-welcome">
            <div className="arise-logo">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            </div>
            <h2 className="arise-welcome-title">What can I help with?</h2>
            <div className="arise-suggestions">
                {suggestions.map((s, i) => (
                    <button key={i} className="arise-suggestion" onClick={() => onSuggestionClick(s.text)}>
                        <span>{s.emoji}</span> {s.text}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
    const isImage = file.type.startsWith('image/');
    const [preview, setPreview] = useState<string>('');

    if (isImage && !preview) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    return (
        <div className="file-preview">
            {isImage && preview ? (
                <img src={preview} alt={file.name} />
            ) : (
                <div className="file-icon">📄</div>
            )}
            <span className="file-name">{file.name}</span>
            <button className="remove-btn" onClick={onRemove}>×</button>
        </div>
    );
}

function formatAIResponse(content: string): string {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
