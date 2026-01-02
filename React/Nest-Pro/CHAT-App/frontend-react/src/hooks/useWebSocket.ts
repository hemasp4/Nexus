import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import type { Message } from '../types';

const WS_URL = 'ws://127.0.0.1:8000/ws';

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const { token, user, isAuthenticated } = useAuthStore();
    const { addMessage, setUserOnline, setOnlineUsers } = useChatStore();
    const { setIncomingCall, handleRemoteAnswer, handleRemoteIceCandidate, handleCallEnded } = useCallStore();

    const connect = useCallback(() => {
        if (!token || !isAuthenticated || !user) return;

        const ws = new WebSocket(`${WS_URL}/${user.id}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'message':
                        const newMessage: Message = {
                            id: data.id || `msg-${Date.now()}`,
                            content: data.content,
                            sender_id: data.sender_id,
                            sender_username: data.sender_username,
                            receiver_id: data.receiver_id,
                            room_id: data.room_id,
                            message_type: data.message_type || 'text',
                            file_id: data.file_id,
                            file_name: data.file_name,
                            file_size: data.file_size,
                            created_at: data.timestamp || new Date().toISOString(),
                        };

                        const chatId = data.room_id || data.sender_id;
                        if (chatId) addMessage(chatId, newMessage);
                        break;

                    case 'user_status':
                        setUserOnline(data.user_id, data.status === 'online');
                        break;

                    case 'online_users':
                        // Batch update of online users received on connect
                        console.log('📱 Online users:', data.users);
                        if (Array.isArray(data.users)) {
                            setOnlineUsers(data.users);
                        }
                        break;

                    case 'typing':
                        // Handle typing indicator
                        break;

                    case 'read_receipt':
                        // Handle read receipts
                        break;

                    // WebRTC Call Signaling
                    case 'call_offer':
                        console.log('📞 Incoming call offer:', data);
                        setIncomingCall({
                            from: data.caller_id,
                            fromName: data.caller_name || 'Unknown',
                            fromAvatar: data.caller_avatar,
                            callType: data.call_type === 'video' ? 'video' : 'voice',
                            callId: data.call_id,
                            sdp: data.sdp
                        });
                        break;

                    case 'call_answer':
                        console.log('📞 Call answer received:', data);
                        handleRemoteAnswer(data.sdp);
                        break;

                    case 'ice_candidate':
                        console.log('🧊 ICE candidate received');
                        handleRemoteIceCandidate(data.candidate);
                        break;

                    case 'call_end':
                        console.log('📞 Call ended by remote:', data);
                        if (data.reason === 'declined') {
                            // Show "user is busy" message
                            const calleeName = data.callee_name || 'User';
                            try {
                                // Use speech synthesis for audio notification
                                const utterance = new SpeechSynthesisUtterance(`${calleeName} is busy. Please try again later.`);
                                utterance.rate = 0.9;
                                utterance.pitch = 1;
                                speechSynthesis.speak(utterance);
                            } catch (e) {
                                // Fallback to alert if speech not supported
                                console.log(`${calleeName} is busy. Please try again later.`);
                            }
                        }
                        handleCallEnded();
                        break;
                }
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        ws.onclose = () => {
            console.log('❌ WebSocket disconnected');
            // Attempt reconnect after 3 seconds
            reconnectTimeoutRef.current = window.setTimeout(() => {
                connect();
            }, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [token, user, isAuthenticated, addMessage, setUserOnline]);

    const sendMessage = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        wsRef.current?.close();
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { sendMessage, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
