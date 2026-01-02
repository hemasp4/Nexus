import { useState, useEffect, useRef } from 'react';

// Emoji categories with WhatsApp-style organization
const emojiCategories = {
    recent: { icon: '🕐', name: 'Recent', emojis: [] as string[] },
    smileys: {
        icon: '😀',
        name: 'Smileys',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐']
    },
    gestures: {
        icon: '👋',
        name: 'Gestures',
        emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄']
    },
    animals: {
        icon: '🐶',
        name: 'Animals',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍']
    },
    food: {
        icon: '🍔',
        name: 'Food',
        emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗']
    },
    activities: {
        icon: '⚽',
        name: 'Activities',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗']
    },
    travel: {
        icon: '🚗',
        name: 'Travel',
        emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🚀', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️']
    },
    objects: {
        icon: '💡',
        name: 'Objects',
        emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴']
    },
    symbols: {
        icon: '❤️',
        name: 'Symbols',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳']
    }
};

interface EmojiPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onEmojiSelect: (emoji: string) => void;
    position?: { x: number; y: number };
}

export function EmojiPicker({ isOpen, onClose, onEmojiSelect, position }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [searchQuery, setSearchQuery] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Load recent emojis from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentEmojis');
        if (stored) {
            setRecentEmojis(JSON.parse(stored));
        }
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleEmojiClick = (emoji: string) => {
        // Add to recent emojis
        const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
        setRecentEmojis(newRecent);
        localStorage.setItem('recentEmojis', JSON.stringify(newRecent));

        onEmojiSelect(emoji);
    };

    const getFilteredEmojis = () => {
        if (searchQuery) {
            // Search across all categories
            const allEmojis: string[] = [];
            Object.values(emojiCategories).forEach(cat => {
                if (cat.emojis) allEmojis.push(...cat.emojis);
            });
            return allEmojis;
        }

        if (activeCategory === 'recent') {
            return recentEmojis;
        }

        return emojiCategories[activeCategory as keyof typeof emojiCategories]?.emojis || [];
    };

    if (!isOpen) return null;

    const categoryKeys = Object.keys(emojiCategories);
    const displayEmojis = getFilteredEmojis();

    return (
        <div
            ref={pickerRef}
            style={{
                position: 'absolute',
                bottom: position?.y ?? 60,
                left: position?.x ?? 10,
                width: '320px',
                height: '350px',
                background: '#1e1e2e',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 1000,
                animation: 'slideUp 0.2s ease-out'
            }}
        >
            {/* Search Bar */}
            <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <input
                    type="text"
                    placeholder="Search emoji..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Category Tabs */}
            <div style={{
                display: 'flex',
                padding: '8px',
                gap: '4px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                overflowX: 'auto'
            }}>
                {categoryKeys.map(key => {
                    const cat = emojiCategories[key as keyof typeof emojiCategories];
                    const isActive = activeCategory === key;
                    return (
                        <button
                            key={key}
                            onClick={() => {
                                setActiveCategory(key);
                                setSearchQuery('');
                            }}
                            style={{
                                padding: '6px 8px',
                                background: isActive ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                transition: 'background 0.2s',
                                flexShrink: 0
                            }}
                            title={cat.name}
                        >
                            {cat.icon}
                        </button>
                    );
                })}
            </div>

            {/* Emoji Grid */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '2px',
                alignContent: 'start'
            }}>
                {displayEmojis.length > 0 ? (
                    displayEmojis.map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            onClick={() => handleEmojiClick(emoji)}
                            style={{
                                padding: '6px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '22px',
                                transition: 'background 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {emoji}
                        </button>
                    ))
                ) : (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '20px',
                        color: 'rgba(255,255,255,0.5)'
                    }}>
                        {activeCategory === 'recent' ? 'No recent emojis' : 'No emojis found'}
                    </div>
                )}
            </div>

            {/* Animation keyframes */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
