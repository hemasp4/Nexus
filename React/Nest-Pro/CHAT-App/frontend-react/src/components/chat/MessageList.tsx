import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { Lightbox } from './Lightbox';
import { ForwardModal } from './ForwardModal';
import type { Message } from '../../types';

interface MessageListProps {
    chatId: string;
    chatType: 'user' | 'room' | 'arise' | null;
    searchQuery?: string;
    highlightedMessageId?: string | null;
}

export function MessageList({ chatId, chatType, searchQuery, highlightedMessageId }: MessageListProps) {
    const { messages, isLoadingMessages, setReplyingTo, viewingStarredChat } = useChatStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [scrolledToMessageId, setScrolledToMessageId] = useState<string | null>(null);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxFile, setLightboxFile] = useState({ id: '', name: '', type: 'image' as 'image' | 'video' });

    // Forward modal state
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);

    const allMessages = messages[chatId] || [];

    // Filter messages - apply starred filter if viewingStarredChat, then search filter
    let chatMessages = viewingStarredChat
        ? allMessages.filter(m => m.starred || (m.starred_by && m.starred_by.length > 0))
        : allMessages;

    if (searchQuery) {
        chatMessages = chatMessages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Scroll to bottom on new messages (only when not searching)
    useEffect(() => {
        if (!searchQuery) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [allMessages, searchQuery]);

    // Scroll to highlighted message when search navigation changes
    useEffect(() => {
        if (highlightedMessageId && messageRefs.current.has(highlightedMessageId)) {
            const element = messageRefs.current.get(highlightedMessageId);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedMessageId]);

    const handleReply = (message: Message) => {
        setReplyingTo(message);
    };

    const handleForward = (message: Message) => {
        setMessageToForward(message);
        setForwardModalOpen(true);
    };

    // Track current message for lightbox actions
    const [lightboxMessage, setLightboxMessage] = useState<Message | null>(null);

    const handleImageClick = (fileId: string, fileName: string, message?: Message) => {
        setLightboxFile({ id: fileId, name: fileName, type: 'image' });
        setLightboxMessage(message || null);
        setLightboxOpen(true);
    };

    const handleVideoClick = (fileId: string, fileName: string, message?: Message) => {
        setLightboxFile({ id: fileId, name: fileName, type: 'video' });
        setLightboxMessage(message || null);
        setLightboxOpen(true);
    };

    // Scroll to a specific message (used when clicking reply cards)
    const scrollToMessage = (messageId: string) => {
        if (messageRefs.current.has(messageId)) {
            const element = messageRefs.current.get(messageId);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setScrolledToMessageId(messageId);
            // Clear highlight after a brief moment
            setTimeout(() => setScrolledToMessageId(null), 2000);
        }
    };

    // Format date for separator
    const formatDateSeparator = (date: Date): string => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    // Group messages by date
    const getMessagesWithDateSeparators = () => {
        const result: { type: 'message' | 'separator'; content: Message | string }[] = [];
        let lastDate = '';

        chatMessages.forEach((msg) => {
            const msgDate = new Date(msg.created_at).toDateString();

            if (msgDate !== lastDate) {
                result.push({
                    type: 'separator',
                    content: formatDateSeparator(new Date(msg.created_at))
                });
                lastDate = msgDate;
            }

            result.push({ type: 'message', content: msg });
        });

        return result;
    };

    if (isLoadingMessages) {
        return (
            <div className="messages-container">
                <div className="messages-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
        );
    }

    if (chatMessages.length === 0) {
        return (
            <div className="messages-container">
                <div className="messages-empty">
                    <div className="empty-icon">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3>No messages yet</h3>
                    <p>Send a message to start the conversation</p>
                </div>
            </div>
        );
    }

    const messagesWithSeparators = getMessagesWithDateSeparators();

    return (
        <>
            <div className="messages-container" id="messagesContainer">
                {messagesWithSeparators.map((item, index) => {
                    if (item.type === 'separator') {
                        return (
                            <div key={`sep-${index}`} className="date-separator">
                                <span>{item.content as string}</span>
                            </div>
                        );
                    }

                    const message = item.content as Message;
                    const isHighlighted = highlightedMessageId === message.id || scrolledToMessageId === message.id;
                    return (
                        <div
                            key={message.id}
                            ref={(el) => { if (el) messageRefs.current.set(message.id, el); }}
                            style={{
                                transition: 'background 0.3s ease',
                                background: isHighlighted ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                borderRadius: '8px',
                                padding: isHighlighted ? '4px' : '0',
                                marginBottom: isHighlighted ? '4px' : '0'
                            }}
                        >
                            <MessageBubble
                                message={message}
                                onReply={handleReply}
                                onForward={handleForward}
                                onImageClick={handleImageClick}
                                onVideoClick={handleVideoClick}
                                isGroupChat={chatType === 'room'}
                                allMessages={allMessages}
                                onScrollToMessage={scrollToMessage}
                            />
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Lightbox for image/video preview */}
            <Lightbox
                isOpen={lightboxOpen}
                onClose={() => { setLightboxOpen(false); setLightboxMessage(null); }}
                fileId={lightboxFile.id}
                fileName={lightboxFile.name}
                fileType={lightboxFile.type}
                onReply={lightboxMessage ? () => { setReplyingTo(lightboxMessage); setLightboxOpen(false); } : undefined}
                onForward={lightboxMessage ? () => { setMessageToForward(lightboxMessage); setForwardModalOpen(true); setLightboxOpen(false); } : undefined}
                onShare={async () => {
                    try {
                        if (navigator.share) {
                            await navigator.share({
                                title: lightboxFile.name,
                                url: `http://127.0.0.1:8000/api/files/${lightboxFile.id}`
                            });
                        }
                    } catch (e) { console.log('Share cancelled'); }
                }}
            />

            {/* Forward Modal */}
            <ForwardModal
                isOpen={forwardModalOpen}
                onClose={() => {
                    setForwardModalOpen(false);
                    setMessageToForward(null);
                }}
                message={messageToForward}
            />
        </>
    );
}
