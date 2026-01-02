import { create } from 'zustand';
import api from '../api/config';

interface Status {
    id: string;
    user_id: string;
    username: string;
    avatar?: string;
    content?: string;
    media_id?: string;
    media_type?: string;
    background_color: string;
    created_at: string;
    views: number;
    viewed_by_me?: boolean;
}

interface ContactStatus {
    user_id: string;
    username: string;
    avatar?: string;
    status_count: number;
    latest_time: string;
    all_viewed: boolean;
}

interface StatusState {
    myStatuses: Status[];
    recentStatuses: ContactStatus[];
    viewedStatuses: ContactStatus[];
    viewingUserStatuses: Status[];
    viewingUserId: string | null;
    viewingIndex: number;
    isLoadingStatuses: boolean;
    statuses: Record<string, Status[]>;

    loadMyStatuses: () => Promise<void>;
    loadContactStatuses: () => Promise<void>;
    loadUserStatuses: (userId: string) => Promise<void>;
    createStatus: (data: { content?: string; media_id?: string; media_type?: string; background_color?: string }) => Promise<boolean>;
    deleteStatus: (statusId: string) => Promise<void>;
    deleteAllStatuses: () => Promise<void>;
    viewUserStatus: (userId: string) => void;
    setViewingStatus: (userId: string, index: number) => void;
    nextStatus: () => void;
    prevStatus: () => void;
    closeViewer: () => void;
}

export const useStatusStore = create<StatusState>((set, get) => ({
    myStatuses: [],
    recentStatuses: [],
    viewedStatuses: [],
    viewingUserStatuses: [],
    viewingUserId: null,
    viewingIndex: 0,
    isLoadingStatuses: false,
    statuses: {},

    loadMyStatuses: async () => {
        try {
            const response = await api.get('/api/status/my');
            set({ myStatuses: response.data });
        } catch (error) {
            console.error('Failed to load my statuses:', error);
        }
    },

    loadContactStatuses: async () => {
        set({ isLoadingStatuses: true });
        try {
            const response = await api.get('/api/status/contacts');
            set({
                recentStatuses: response.data.recent || [],
                viewedStatuses: response.data.viewed || [],
                isLoadingStatuses: false
            });
        } catch (error) {
            console.error('Failed to load contact statuses:', error);
            set({ isLoadingStatuses: false });
        }
    },

    loadUserStatuses: async (userId: string) => {
        try {
            const response = await api.get(`/api/status/user/${userId}`);
            set({ viewingUserStatuses: response.data, viewingUserId: userId, viewingIndex: 0 });
        } catch (error) {
            console.error('Failed to load user statuses:', error);
        }
    },

    createStatus: async (data) => {
        try {
            await api.post('/api/status', data);
            await get().loadMyStatuses();
            return true;
        } catch (error) {
            console.error('Failed to create status:', error);
            return false;
        }
    },

    deleteStatus: async (statusId: string) => {
        try {
            await api.delete(`/api/status/${statusId}`);
            set((state) => ({
                myStatuses: state.myStatuses.filter(s => s.id !== statusId)
            }));
        } catch (error) {
            console.error('Failed to delete status:', error);
        }
    },

    deleteAllStatuses: async () => {
        try {
            const { myStatuses } = get();
            for (const status of myStatuses) {
                await api.delete(`/api/status/${status.id}`);
            }
            set({ myStatuses: [] });
        } catch (error) {
            console.error('Failed to delete all statuses:', error);
        }
    },

    viewUserStatus: (userId: string) => {
        get().loadUserStatuses(userId);
    },

    setViewingStatus: (userId: string, index: number) => {
        get().loadUserStatuses(userId);
        set({ viewingIndex: index });
    },

    nextStatus: () => {
        const { viewingIndex, viewingUserStatuses } = get();
        if (viewingIndex < viewingUserStatuses.length - 1) {
            set({ viewingIndex: viewingIndex + 1 });
        } else {
            get().closeViewer();
        }
    },

    prevStatus: () => {
        const { viewingIndex } = get();
        if (viewingIndex > 0) {
            set({ viewingIndex: viewingIndex - 1 });
        }
    },

    closeViewer: () => {
        set({ viewingUserId: null, viewingUserStatuses: [], viewingIndex: 0 });
    },
}));
