import { create } from 'zustand';
import api from '../api/config';
import webRTCService from '../services/WebRTCService';

interface CallRecord {
    id: string;
    caller_id: string;
    caller_name: string;
    callee_id: string;
    callee_name: string;
    call_type: string;
    status: string;
    duration: number;
    timestamp: string;
    is_outgoing: boolean;
    // For display
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    direction: 'incoming' | 'outgoing';
}

interface IncomingCallData {
    from: string;
    fromName: string;
    fromAvatar?: string;
    callType: 'voice' | 'video';
    callId?: string;
    sdp?: RTCSessionDescriptionInit;
}

interface CallState {
    callHistory: CallRecord[];
    isLoadingHistory: boolean;
    isInCall: boolean;
    callState: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
    activeCall: {
        callId: string;
        peerId: string;
        peerName: string;
        peerAvatar?: string;
        callType: 'voice' | 'video';
        direction: 'incoming' | 'outgoing';
        startTime?: Date;
    } | null;
    isMuted: boolean;
    isVideoEnabled: boolean;
    isSpeakerOn: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    incomingCall: IncomingCallData | null;
    sendWebSocket: ((data: object) => void) | null;

    // Actions
    loadCallHistory: () => Promise<void>;
    setSendWebSocket: (fn: (data: object) => void) => void;
    initiateCall: (userId: string, userName: string, userAvatar: string | undefined, callType: 'voice' | 'video') => Promise<void>;
    acceptCall: () => Promise<void>;
    declineCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleSpeaker: () => void;
    setIncomingCall: (call: IncomingCallData | null) => void;
    handleRemoteAnswer: (sdp: RTCSessionDescriptionInit) => void;
    handleRemoteIceCandidate: (candidate: RTCIceCandidateInit) => void;
    handleCallEnded: () => void;
    createCallLog: (calleeId: string, callType: string, status: string, duration: number) => Promise<void>;
    deleteCallLog: (callId: string) => Promise<void>;
    clearHistory: () => Promise<void>;
}

export const useCallStore = create<CallState>((set, get) => {
    // Setup WebRTC event listeners
    webRTCService.on('localStream', (stream) => {
        set({ localStream: stream as MediaStream });
    });

    webRTCService.on('remoteStream', (stream) => {
        set({ remoteStream: stream as MediaStream });
    });

    webRTCService.on('iceCandidate', (candidate) => {
        const { sendWebSocket, activeCall } = get();
        if (sendWebSocket && activeCall) {
            sendWebSocket({
                type: 'ice_candidate',
                call_id: activeCall.callId,
                candidate: candidate
            });
        }
    });

    webRTCService.on('connected', () => {
        set({ callState: 'connected' });
    });

    webRTCService.on('disconnected', () => {
        get().endCall();
    });

    return {
        callHistory: [],
        isLoadingHistory: false,
        isInCall: false,
        callState: 'idle',
        activeCall: null,
        isMuted: false,
        isVideoEnabled: true,
        isSpeakerOn: false,
        localStream: null,
        remoteStream: null,
        incomingCall: null,
        sendWebSocket: null,

        setSendWebSocket: (fn) => set({ sendWebSocket: fn }),

        loadCallHistory: async () => {
            set({ isLoadingHistory: true });
            try {
                const response = await api.get('/api/calls');
                const history = response.data.map((call: CallRecord) => ({
                    ...call,
                    participantId: call.is_outgoing ? call.callee_id : call.caller_id,
                    participantName: call.is_outgoing ? call.callee_name : call.caller_name,
                    direction: call.is_outgoing ? 'outgoing' : 'incoming',
                    callType: call.call_type,
                }));
                set({ callHistory: history, isLoadingHistory: false });
            } catch (error) {
                console.error('Failed to load call history:', error);
                set({ callHistory: [], isLoadingHistory: false });
            }
        },

        initiateCall: async (userId, userName, userAvatar, callType) => {
            const { sendWebSocket } = get();
            if (!sendWebSocket) {
                console.error('WebSocket not connected');
                return;
            }

            const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            set({
                isInCall: true,
                callState: 'calling',
                activeCall: {
                    callId,
                    peerId: userId,
                    peerName: userName,
                    peerAvatar: userAvatar,
                    callType,
                    direction: 'outgoing',
                },
                isVideoEnabled: callType === 'video',
            });

            try {
                // Initialize WebRTC
                await webRTCService.initializePeerConnection();

                // Get user media
                const stream = await webRTCService.getUserMedia(callType === 'video');
                webRTCService.addLocalStream(stream);

                // Create and send offer
                const offer = await webRTCService.createOffer();

                sendWebSocket({
                    type: 'call_offer',
                    call_id: callId,
                    callee_id: userId,
                    call_type: callType,
                    sdp: offer
                });

                set({ callState: 'ringing' });
            } catch (error) {
                console.error('Failed to initiate call:', error);
                set({
                    isInCall: false,
                    callState: 'idle',
                    activeCall: null
                });
            }
        },

        acceptCall: async () => {
            const { incomingCall, sendWebSocket } = get();
            if (!incomingCall || !sendWebSocket) return;

            const callId = incomingCall.callId || `call-${Date.now()}`;

            set({
                isInCall: true,
                callState: 'connecting',
                activeCall: {
                    callId,
                    peerId: incomingCall.from,
                    peerName: incomingCall.fromName,
                    peerAvatar: incomingCall.fromAvatar,
                    callType: incomingCall.callType,
                    direction: 'incoming',
                    startTime: new Date(),
                },
                incomingCall: null,
                isVideoEnabled: incomingCall.callType === 'video',
            });

            try {
                // Initialize WebRTC
                await webRTCService.initializePeerConnection();

                // Get user media
                const stream = await webRTCService.getUserMedia(incomingCall.callType === 'video');
                webRTCService.addLocalStream(stream);

                // Handle the incoming offer
                if (incomingCall.sdp) {
                    await webRTCService.handleOffer(incomingCall.sdp);
                }

                // Create and send answer
                const answer = await webRTCService.createAnswer();

                sendWebSocket({
                    type: 'call_answer',
                    call_id: callId,
                    sdp: answer
                });

                set({ callState: 'connected', activeCall: { ...get().activeCall!, startTime: new Date() } });
            } catch (error) {
                console.error('Failed to accept call:', error);
                set({
                    isInCall: false,
                    callState: 'idle',
                    activeCall: null
                });
            }
        },

        declineCall: () => {
            const { incomingCall, sendWebSocket } = get();
            if (incomingCall && sendWebSocket) {
                sendWebSocket({
                    type: 'call_end',
                    call_id: incomingCall.callId,
                    reason: 'declined'
                });
                get().createCallLog(incomingCall.from, incomingCall.callType, 'rejected', 0);
            }
            set({ incomingCall: null });
        },

        endCall: () => {
            const { activeCall, sendWebSocket } = get();

            if (activeCall && sendWebSocket) {
                sendWebSocket({
                    type: 'call_end',
                    call_id: activeCall.callId
                });

                if (activeCall.startTime) {
                    const duration = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
                    get().createCallLog(activeCall.peerId, activeCall.callType, 'completed', duration);
                }
            }

            webRTCService.cleanup();

            set({
                isInCall: false,
                callState: 'idle',
                activeCall: null,
                localStream: null,
                remoteStream: null,
                isMuted: false,
                isVideoEnabled: true,
            });
        },

        handleRemoteAnswer: async (sdp: RTCSessionDescriptionInit) => {
            try {
                await webRTCService.handleAnswer(sdp);
                set({
                    callState: 'connected',
                    activeCall: { ...get().activeCall!, startTime: new Date() }
                });
            } catch (error) {
                console.error('Failed to handle remote answer:', error);
            }
        },

        handleRemoteIceCandidate: async (candidate: RTCIceCandidateInit) => {
            try {
                await webRTCService.addIceCandidate(candidate);
            } catch (error) {
                console.error('Failed to add ICE candidate:', error);
            }
        },

        handleCallEnded: () => {
            webRTCService.cleanup();
            set({
                isInCall: false,
                callState: 'ended',
                activeCall: null,
                localStream: null,
                remoteStream: null,
                incomingCall: null,
            });
            // Reset to idle after a moment
            setTimeout(() => set({ callState: 'idle' }), 1000);
        },

        createCallLog: async (calleeId, callType, status, duration) => {
            try {
                await api.post('/api/calls', {
                    callee_id: calleeId,
                    call_type: callType,
                    status,
                    duration,
                });
                get().loadCallHistory();
            } catch (error) {
                console.error('Failed to create call log:', error);
            }
        },

        deleteCallLog: async (callId) => {
            try {
                await api.delete(`/api/calls/${callId}`);
                set((state) => ({
                    callHistory: state.callHistory.filter(c => c.id !== callId),
                }));
            } catch (error) {
                console.error('Failed to delete call log:', error);
            }
        },

        clearHistory: async () => {
            try {
                await api.delete('/api/calls');
                set({ callHistory: [] });
            } catch (error) {
                console.error('Failed to clear call history:', error);
            }
        },

        toggleMute: () => {
            const enabled = webRTCService.toggleAudio();
            set({ isMuted: !enabled });
        },

        toggleVideo: () => {
            const enabled = webRTCService.toggleVideo();
            set({ isVideoEnabled: enabled });
        },

        toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),

        setIncomingCall: (call) => set({ incomingCall: call }),
    };
});
