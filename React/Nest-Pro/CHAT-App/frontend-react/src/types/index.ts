// User types
export interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    status?: 'online' | 'offline' | 'away';
    bio?: string;
    about?: string;
    created_at?: string;
}

// Message types
export interface Message {
    id: string;
    content: string;
    sender_id: string;
    sender_username?: string;
    sender_avatar?: string;
    receiver_id?: string;
    room_id?: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice';
    file_id?: string;
    file_name?: string;
    file_size?: number;
    reply_to?: string;
    read_by?: string[];
    delivered_to?: string[];
    starred_by?: string[];
    starred?: boolean;
    created_at: string;
    timestamp?: string;
    delivered_at?: string;
    read_at?: string;
    status?: 'sent' | 'delivered' | 'read';
    deleted?: boolean;
    edited?: boolean;
}

// Chat/Room types
export interface Contact {
    id: string;
    user_id: string;
    contact_id: string;
    username: string;
    email?: string;
    avatar?: string;
    status?: 'online' | 'offline';
    last_message?: Message;
    unread_count?: number;
}

export interface Room {
    id: string;
    name: string;
    type: 'group' | 'direct';
    members: string[];
    avatar?: string;
    created_by: string;
    created_at: string;
    last_message?: Message;
}

// AI Conversation types
export interface AriseConversation {
    id: string;
    title: string;
    model: string;
    messages: AriseMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface AriseMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    attachments?: { name: string; type: string }[];
}

// Navigation types
export type NavView = 'chats' | 'groups' | 'calls' | 'status' | 'arise' | 'starred' | 'archived' | 'settings' | 'profile';
export type ChatType = 'user' | 'room' | 'arise';

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
