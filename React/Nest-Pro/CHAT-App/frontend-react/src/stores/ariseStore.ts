import { create } from 'zustand';
import type { AriseConversation, AriseMessage } from '../types';
import api from '../api/config';

interface AriseState {
    conversations: AriseConversation[];
    currentConversation: AriseConversation | null;
    selectedModel: string;
    models: { id: string; name: string; provider: string }[];
    isLoading: boolean;
    attachedFiles: File[];

    // Actions
    loadConversations: () => Promise<void>;
    createConversation: () => Promise<AriseConversation | null>;
    openConversation: (id: string) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    renameConversation: (id: string, title: string) => Promise<void>;

    sendMessage: (content: string) => Promise<void>;
    setModel: (modelId: string) => void;

    addFile: (file: File) => void;
    removeFile: (index: number) => void;
    clearFiles: () => void;

    newChat: () => void;
}

export const useAriseStore = create<AriseState>((set, get) => ({
    conversations: [],
    currentConversation: null,
    selectedModel: 'gemini-1.5-flash',
    models: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
    ],
    isLoading: false,
    attachedFiles: [],

    loadConversations: async () => {
        try {
            const response = await api.get('/api/arise/conversations');
            const conversations = response.data.map((c: any) => ({
                id: c.id,
                title: c.title || 'New Chat',
                model: c.model || 'gemini-pro',
                messages: c.messages || [],
                createdAt: c.created_at,
                updatedAt: c.updated_at,
            }));
            set({ conversations });
        } catch (error) {
            console.error('Failed to load AI conversations:', error);
        }
    },

    createConversation: async () => {
        try {
            const response = await api.post('/api/arise/conversations', {
                title: 'New Chat',
                model: get().selectedModel,
            });
            const newConv: AriseConversation = {
                id: response.data.id,
                title: response.data.title,
                model: response.data.model,
                messages: [],
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at,
            };
            set((state) => ({
                conversations: [newConv, ...state.conversations],
                currentConversation: newConv,
            }));
            return newConv;
        } catch (error) {
            console.error('Failed to create conversation:', error);
            return null;
        }
    },

    openConversation: async (id: string) => {
        try {
            const response = await api.get(`/api/arise/conversations/${id}`);
            const conv: AriseConversation = {
                id: response.data.id,
                title: response.data.title || 'New Chat',
                model: response.data.model || 'gemini-pro',
                messages: response.data.messages || [],
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at,
            };
            set({ currentConversation: conv });
        } catch (error) {
            console.error('Failed to open conversation:', error);
        }
    },

    deleteConversation: async (id: string) => {
        try {
            await api.delete(`/api/arise/conversations/${id}`);
            set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
                currentConversation: state.currentConversation?.id === id ? null : state.currentConversation,
            }));
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    },

    renameConversation: async (id: string, title: string) => {
        try {
            await api.put(`/api/arise/conversations/${id}`, { title });
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, title } : c
                ),
                currentConversation: state.currentConversation?.id === id
                    ? { ...state.currentConversation, title }
                    : state.currentConversation,
            }));
        } catch (error) {
            console.error('Failed to rename conversation:', error);
        }
    },

    sendMessage: async (content: string) => {
        const { currentConversation, selectedModel } = get();
        set({ isLoading: true });

        // Create new conversation if needed
        let convId = currentConversation?.id;
        if (!convId) {
            const newConv = await get().createConversation();
            if (!newConv) {
                set({ isLoading: false });
                return;
            }
            convId = newConv.id;
        }

        // Add user message to local state
        const userMessage: AriseMessage = {
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        };

        set((state) => ({
            currentConversation: state.currentConversation
                ? {
                    ...state.currentConversation,
                    messages: [...state.currentConversation.messages, userMessage],
                }
                : null,
        }));

        try {
            // Send to API and get AI response
            const response = await api.post('/api/arise/chat', {
                content,
                model: selectedModel,
                conversation_history: get().currentConversation?.messages.slice(-10) || [],
            });

            const aiMessage: AriseMessage = {
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date().toISOString(),
            };

            // Update conversation with AI response
            set((state) => {
                const updatedConv = state.currentConversation
                    ? {
                        ...state.currentConversation,
                        messages: [...state.currentConversation.messages, aiMessage],
                        title: state.currentConversation.messages.length <= 1
                            ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                            : state.currentConversation.title,
                    }
                    : null;

                return {
                    currentConversation: updatedConv,
                    conversations: state.conversations.map((c) =>
                        c.id === updatedConv?.id ? updatedConv : c
                    ),
                    isLoading: false,
                };
            });

            // Save to database
            await api.put(`/api/arise/conversations/${convId}`, {
                title: get().currentConversation?.title,
                messages: get().currentConversation?.messages,
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            set({ isLoading: false });
        }
    },

    setModel: (modelId: string) => set({ selectedModel: modelId }),

    addFile: (file: File) => set((state) => ({
        attachedFiles: [...state.attachedFiles, file]
    })),

    removeFile: (index: number) => set((state) => ({
        attachedFiles: state.attachedFiles.filter((_, i) => i !== index),
    })),

    clearFiles: () => set({ attachedFiles: [] }),

    newChat: () => set({ currentConversation: null }),
}));
