import axios from 'axios';

// API base URL - matches backend
export const API_URL = 'http://127.0.0.1:8000';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors (401 = token expired/invalid, 403 = no token provided by HTTPBearer)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Check if it's an auth-related 403 (missing credentials)
            const detail = error.response?.data?.detail;
            if (error.response?.status === 401 || detail === 'Not authenticated') {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
