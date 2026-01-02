import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../api/config';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, username: string, password: string) => Promise<boolean>;
    logout: () => void;
    setUser: (user: User) => void;
    updateUser: (updates: Partial<User>) => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/api/auth/login', {
                        email,
                        password
                    });

                    const { access_token, user } = response.data;
                    localStorage.setItem('token', access_token);

                    set({
                        user,
                        token: access_token,
                        isAuthenticated: true,
                        isLoading: false
                    });
                    return true;
                } catch (error: any) {
                    const detail = error.response?.data?.detail;
                    let errorMsg = 'Login failed';
                    if (typeof detail === 'string') {
                        errorMsg = detail;
                    } else if (Array.isArray(detail)) {
                        errorMsg = detail.map((d: any) => d.msg || d).join(', ');
                    } else if (detail?.msg) {
                        errorMsg = detail.msg;
                    }
                    set({ error: errorMsg, isLoading: false });
                    return false;
                }
            },

            register: async (email: string, username: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    await api.post('/api/auth/register', { email, username, password });
                    set({ isLoading: false });
                    return true;
                } catch (error: any) {
                    const detail = error.response?.data?.detail;
                    let errorMsg = 'Registration failed';
                    if (typeof detail === 'string') {
                        errorMsg = detail;
                    } else if (Array.isArray(detail)) {
                        errorMsg = detail.map((d: any) => d.msg || d).join(', ');
                    } else if (detail?.msg) {
                        errorMsg = detail.msg;
                    }
                    set({ error: errorMsg, isLoading: false });
                    return false;
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            setUser: (user: User) => set({ user }),
            updateUser: (updates: Partial<User>) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),
            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
