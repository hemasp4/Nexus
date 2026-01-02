import { create } from 'zustand';
import type { Contact, Message, Room, NavView, ChatType } from '../types';
import api from '../api/config';

interface ChatState {
    // Navigation
    currentView: NavView;

    // Contacts & Rooms
    contacts: Contact[];
    rooms: Room[];
    onlineUsers: Set<string>;

    // Current Chat
    currentChatId: string | null;
    currentChatType: ChatType | null;
    viewingStarredChat: boolean;
    messages: Record<string, Message[]>;

    // Reply state
    replyingTo: Message | null;

    // Selection mode
    selectionMode: boolean;
    selectedMessages: Set<string>;

    // Loading states
    isLoadingContacts: boolean;
    isLoadingMessages: boolean;

    // Actions
    setCurrentView: (view: NavView) => void;
    setCurrentChat: (id: string | null, type: ChatType | null) => void;
    setViewingStarredChat: (viewing: boolean) => void;

    loadContacts: () => Promise<void>;
    loadRooms: () => Promise<void>;
    loadMessages: (chatId: string, chatType: ChatType) => Promise<void>;
    addMessage: (chatId: string, message: Message) => void;
    deleteMessage: (chatId: string, messageId: string, deleteType?: 'forMe' | 'forEveryone') => Promise<void>;
    starMessage: (chatId: string, messageId: string, starred: boolean) => Promise<void>;

    starredMessages: Message[];
    loadStarredMessages: () => Promise<void>;

    setReplyingTo: (message: Message | null) => void;
    setOnlineUsers: (users: string[]) => void;
    setUserOnline: (userId: string, isOnline: boolean) => void;

    // Contact actions
    searchUsers: (query: string) => Promise<Contact[]>;
    addContact: (contactId: string) => Promise<boolean>;

    // Selection mode actions
    toggleSelectionMode: (enabled?: boolean) => void;
    toggleMessageSelection: (messageId: string) => void;
    clearSelection: () => void;
    deleteSelectedMessages: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    currentView: 'chats',
    contacts: [],
    rooms: [],
    onlineUsers: new Set(),
    currentChatId: null,
    currentChatType: null,
    viewingStarredChat: false,
    messages: {},
    replyingTo: null,
    starredMessages: [],
    selectionMode: false,
    selectedMessages: new Set<string>(),
    isLoadingContacts: false,
    isLoadingMessages: false,

    setCurrentView: (view: NavView) => set({ currentView: view }),

    setCurrentChat: (id: string | null, type: ChatType | null) => {
        set({ currentChatId: id, currentChatType: type });
        if (id && type && type !== 'arise') {
            get().loadMessages(id, type);
        }
    },

    setViewingStarredChat: (viewing: boolean) => set({ viewingStarredChat: viewing }),

    loadContacts: async () => {
        set({ isLoadingContacts: true });
        try {
            // Use correct endpoint: /api/users/contacts/list
            const response = await api.get('/api/users/contacts/list');
            // Transform API response to Contact type
            const contacts: Contact[] = response.data.map((user: {
                id: string;
                username: string;
                avatar?: string;
                status?: string;
            }) => ({
                id: user.id,
                user_id: user.id,
                contact_id: user.id,
                username: user.username,
                avatar: user.avatar,
                status: user.status || 'offline',
            }));
            set({ contacts, isLoadingContacts: false });
        } catch (error) {
            console.error('Failed to load contacts:', error);
            set({ isLoadingContacts: false, contacts: [] });
        }
    },

    loadRooms: async () => {
        try {
            const response = await api.get('/api/rooms');
            set({ rooms: response.data });
        } catch (error) {
            console.error('Failed to load rooms:', error);
            set({ rooms: [] });
        }
    },

    loadMessages: async (chatId: string, chatType: ChatType) => {
        set({ isLoadingMessages: true });
        try {
            // Use correct endpoints based on API
            const endpoint = chatType === 'room'
                ? `/api/messages/room/${chatId}`
                : `/api/messages/conversation/${chatId}`;

            const response = await api.get(endpoint);
            // Transform timestamp to created_at for consistency
            const messages: Message[] = response.data.map((msg: {
                id: string;
                sender_id: string;
                sender_username?: string;
                receiver_id?: string;
                room_id?: string;
                content: string;
                message_type: string;
                file_id?: string;
                file_name?: string;
                file_size?: number;
                reply_to?: string;
                read_by?: string[];
                delivered_to?: string[];
                timestamp: string;
            }) => ({
                ...msg,
                created_at: msg.timestamp,
            }));
            set((state) => ({
                messages: { ...state.messages, [chatId]: messages },
                isLoadingMessages: false,
            }));
        } catch (error) {
            console.error('Failed to load messages:', error);
            set({ isLoadingMessages: false });
        }
    },

    addMessage: (chatId: string, message: Message) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [chatId]: [...(state.messages[chatId] || []), message],
            },
        }));
    },

    deleteMessage: async (chatId: string, messageId: string, deleteType: 'forMe' | 'forEveryone' = 'forEveryone') => {
        try {
            if (deleteType === 'forMe') {
                // Delete for me - show "deleted" placeholder locally (don't call backend)
                set((state) => ({
                    messages: {
                        ...state.messages,
                        [chatId]: state.messages[chatId]?.map(msg =>
                            msg.id === messageId
                                ? { ...msg, content: 'This message was deleted', deleted: true, message_type: 'text', file_id: undefined, file_name: undefined }
                                : msg
                        ) || [],
                    },
                }));
            } else {
                // Delete for everyone - update backend and show "deleted" placeholder
                await api.delete(`/api/messages/${messageId}`);
                set((state) => ({
                    messages: {
                        ...state.messages,
                        [chatId]: state.messages[chatId]?.map(msg =>
                            msg.id === messageId
                                ? { ...msg, content: 'This message was deleted', deleted: true, message_type: 'text', file_id: undefined, file_name: undefined }
                                : msg
                        ) || [],
                    },
                }));
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    },

    searchUsers: async (query: string): Promise<Contact[]> => {
        try {
            const response = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
            return response.data.map((user: {
                id: string;
                username: string;
                avatar?: string;
                status?: string;
            }) => ({
                id: user.id,
                user_id: user.id,
                contact_id: user.id,
                username: user.username,
                avatar: user.avatar,
                status: user.status || 'offline',
            }));
        } catch (error) {
            console.error('Failed to search users:', error);
            return [];
        }
    },

    addContact: async (contactId: string): Promise<boolean> => {
        try {
            await api.post(`/api/users/contacts/${contactId}`);
            // Reload contacts after adding
            await get().loadContacts();
            return true;
        } catch (error) {
            console.error('Failed to add contact:', error);
            return false;
        }
    },

    starMessage: async (chatId: string, messageId: string, starred: boolean) => {
        try {
            // Persist to backend first
            if (starred) {
                await api.post(`/api/messages/${messageId}/star`);
            } else {
                await api.delete(`/api/messages/${messageId}/star`);
            }

            // Update local state
            set((state) => ({
                messages: {
                    ...state.messages,
                    [chatId]: state.messages[chatId]?.map(msg =>
                        msg.id === messageId ? { ...msg, starred } : msg
                    ) || [],
                },
            }));

            // Reload starred messages to keep in sync
            get().loadStarredMessages();
        } catch (error) {
            console.error('Failed to star message:', error);
        }
    },

    loadStarredMessages: async () => {
        try {
            const response = await api.get('/api/messages/starred');
            // Transform response to include starred flag and created_at
            const starred = response.data.map((msg: any) => ({
                ...msg,
                starred: true,
                created_at: msg.timestamp,
            }));
            set({ starredMessages: starred });
        } catch (error) {
            console.error('Failed to load starred messages:', error);
            // Fallback to local state
            const allMessages = Object.values(get().messages).flat();
            const starred = allMessages.filter(m => m.starred);
            set({ starredMessages: starred });
        }
    },

    setOnlineUsers: (users: string[]) => {
        // Update onlineUsers set
        set({ onlineUsers: new Set(users) });

        // Update contacts status based on online users
        set((state) => ({
            contacts: state.contacts.map(contact => ({
                ...contact,
                status: users.includes(contact.contact_id) ? 'online' : 'offline'
            }))
        }));
    },

    setUserOnline: (userId: string, isOnline: boolean) => {
        set((state) => {
            const newOnlineUsers = new Set(state.onlineUsers);
            if (isOnline) {
                newOnlineUsers.add(userId);
            } else {
                newOnlineUsers.delete(userId);
            }

            return {
                onlineUsers: newOnlineUsers,
                contacts: state.contacts.map(contact =>
                    contact.contact_id === userId
                        ? { ...contact, status: isOnline ? 'online' : 'offline' }
                        : contact
                )
            };
        });
    },

    setReplyingTo: (message: Message | null) => set({ replyingTo: message }),

    // Selection mode actions
    toggleSelectionMode: (enabled?: boolean) => {
        set((state) => ({
            selectionMode: enabled !== undefined ? enabled : !state.selectionMode,
            selectedMessages: enabled === false ? new Set<string>() : state.selectedMessages,
        }));
    },

    toggleMessageSelection: (messageId: string) => {
        set((state) => {
            const newSelected = new Set(state.selectedMessages);
            if (newSelected.has(messageId)) {
                newSelected.delete(messageId);
            } else {
                newSelected.add(messageId);
            }
            return { selectedMessages: newSelected };
        });
    },

    clearSelection: () => {
        set({ selectedMessages: new Set<string>(), selectionMode: false });
    },

    deleteSelectedMessages: async () => {
        const { selectedMessages, currentChatId } = get();
        if (!currentChatId || selectedMessages.size === 0) return;

        // Delete each selected message
        for (const messageId of selectedMessages) {
            try {
                await api.delete(`/api/messages/${messageId}`);
            } catch (error) {
                console.error('Failed to delete message:', messageId, error);
            }
        }

        // Update local state
        set((state) => ({
            messages: {
                ...state.messages,
                [currentChatId]: state.messages[currentChatId]?.filter(
                    msg => !selectedMessages.has(msg.id)
                ) || [],
            },
            selectedMessages: new Set<string>(),
            selectionMode: false,
        }));
    },
}));
