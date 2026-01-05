import { create } from 'zustand';
import api from '../api/config';

interface UserSettings {
    theme: 'dark' | 'light' | 'system';
    wallpaper: string;
    font_size: 'small' | 'medium' | 'large';
    notifications: boolean;
    message_sounds: boolean;
    read_receipts: boolean;
    last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
    profile_photo_visibility: 'everyone' | 'contacts' | 'nobody';
    about_visibility: 'everyone' | 'contacts' | 'nobody';
    // Additional settings
    language?: string;
    start_minimized?: boolean;
    enter_is_send?: boolean;
    media_auto_download?: 'always' | 'wifi' | 'never';
    notification_groups?: boolean;
    // Auto-save files setting
    autoSaveFiles?: boolean;
}

interface BlockedUser {
    id: string;
    username: string;
    avatar?: string;
}

interface SettingsState {
    settings: UserSettings;
    blockedUsers: BlockedUser[];
    isLoading: boolean;
    currentSection: 'general' | 'account' | 'privacy' | 'appearance' | 'storage' | 'chats' | 'videovoice' | 'notifications' | 'personalization' | 'shortcuts' | 'help';

    // Actions
    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    setWallpaper: (wallpaper: string) => void;
    setFontSize: (size: 'small' | 'medium' | 'large') => void;

    loadBlockedUsers: () => Promise<void>;
    blockUser: (userId: string) => Promise<boolean>;
    unblockUser: (userId: string) => Promise<boolean>;

    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    clearCache: () => void;

    setCurrentSection: (section: SettingsState['currentSection']) => void;
}

const defaultSettings: UserSettings = {
    theme: 'dark',
    wallpaper: 'default',
    font_size: 'medium',
    notifications: true,
    message_sounds: true,
    read_receipts: true,
    last_seen_visibility: 'everyone',
    profile_photo_visibility: 'everyone',
    about_visibility: 'everyone',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: defaultSettings,
    blockedUsers: [],
    isLoading: false,
    currentSection: 'general',

    loadSettings: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get('/api/settings');
            const loadedSettings = { ...defaultSettings, ...response.data };
            set({ settings: loadedSettings, isLoading: false });

            // Apply theme immediately
            get().setTheme(loadedSettings.theme);
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoading: false });
        }
    },

    updateSettings: async (updates: Partial<UserSettings>) => {
        try {
            const response = await api.put('/api/settings', updates);
            set((state) => ({
                settings: { ...state.settings, ...response.data }
            }));
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    },

    setTheme: (theme: 'dark' | 'light' | 'system') => {
        // Apply theme to DOM
        const root = document.documentElement;

        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', theme);
        }

        // Save to localStorage for persistence
        localStorage.setItem('nexuschat_theme', theme);

        // Update state and backend
        set((state) => ({
            settings: { ...state.settings, theme }
        }));
        get().updateSettings({ theme });
    },

    setWallpaper: (wallpaper: string) => {
        // Apply wallpaper to chat area
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            if (wallpaper === 'default') {
                chatArea.style.backgroundImage = '';
            } else {
                chatArea.style.backgroundImage = `url(${wallpaper})`;
            }
        }

        localStorage.setItem('nexuschat_wallpaper', wallpaper);

        set((state) => ({
            settings: { ...state.settings, wallpaper }
        }));
        get().updateSettings({ wallpaper });
    },

    setFontSize: (font_size: 'small' | 'medium' | 'large') => {
        const root = document.documentElement;
        const sizes = { small: '14px', medium: '16px', large: '18px' };
        root.style.setProperty('--font-size-base', sizes[font_size]);

        set((state) => ({
            settings: { ...state.settings, font_size }
        }));
        get().updateSettings({ font_size });
    },

    loadBlockedUsers: async () => {
        try {
            const response = await api.get('/api/users/blocked');
            set({ blockedUsers: response.data });
        } catch (error) {
            console.error('Failed to load blocked users:', error);
        }
    },

    blockUser: async (userId: string): Promise<boolean> => {
        try {
            await api.post(`/api/users/block/${userId}`);
            await get().loadBlockedUsers();
            return true;
        } catch (error) {
            console.error('Failed to block user:', error);
            return false;
        }
    },

    unblockUser: async (userId: string): Promise<boolean> => {
        try {
            await api.delete(`/api/users/block/${userId}`);
            set((state) => ({
                blockedUsers: state.blockedUsers.filter(u => u.id !== userId)
            }));
            return true;
        } catch (error) {
            console.error('Failed to unblock user:', error);
            return false;
        }
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<boolean> => {
        try {
            await api.put('/api/settings/password', {
                old_password: oldPassword,
                new_password: newPassword
            });
            return true;
        } catch (error) {
            console.error('Failed to change password:', error);
            return false;
        }
    },

    clearCache: () => {
        localStorage.removeItem('nexuschat_messages_cache');
        localStorage.removeItem('nexuschat_contacts_cache');
        console.log('Cache cleared');
    },

    setCurrentSection: (section) => set({ currentSection: section }),
}));
