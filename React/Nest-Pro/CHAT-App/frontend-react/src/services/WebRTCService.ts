// WebRTC Service - Manages peer connections for video/audio calls

type CallEventType = 'localStream' | 'remoteStream' | 'iceCandidate' | 'connected' | 'disconnected' | 'error';

type CallEventHandler = (data: unknown) => void;

interface CallEvents {
    [key: string]: CallEventHandler[];
}

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private events: CallEvents = {};
    private iceCandidateQueue: RTCIceCandidateInit[] = [];
    private isRemoteDescriptionSet = false;

    // STUN servers for ICE (free Google servers)
    private readonly iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ];

    // Event handling
    on(event: CallEventType, handler: CallEventHandler) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(handler);
    }

    off(event: CallEventType, handler: CallEventHandler) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(h => h !== handler);
        }
    }

    private emit(event: CallEventType, data?: unknown) {
        if (this.events[event]) {
            this.events[event].forEach(handler => handler(data));
        }
    }

    // Initialize peer connection
    async initializePeerConnection(): Promise<RTCPeerConnection> {
        // Cleanup existing connection
        this.cleanup();

        this.peerConnection = new RTCPeerConnection({
            iceServers: this.iceServers
        });

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.emit('iceCandidate', event.candidate.toJSON());
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log('[WebRTC] Connection state:', state);

            if (state === 'connected') {
                this.emit('connected', null);
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.emit('disconnected', null);
            }
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('[WebRTC] Received remote track:', event.track.kind);
            if (event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.emit('remoteStream', this.remoteStream);
            }
        };

        // Handle ICE gathering state
        this.peerConnection.onicegatheringstatechange = () => {
            console.log('[WebRTC] ICE gathering state:', this.peerConnection?.iceGatheringState);
        };

        return this.peerConnection;
    }

    // Get user media (camera/microphone)
    async getUserMedia(video: boolean = true): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: video ? { width: 1280, height: 720, facingMode: 'user' } : false
            });

            this.emit('localStream', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] Failed to get user media:', error);
            this.emit('error', error);
            throw error;
        }
    }

    // Add local stream to peer connection
    addLocalStream(stream: MediaStream) {
        if (!this.peerConnection) {
            console.error('[WebRTC] No peer connection');
            return;
        }

        stream.getTracks().forEach(track => {
            console.log('[WebRTC] Adding local track:', track.kind);
            this.peerConnection!.addTrack(track, stream);
        });
    }

    // Create SDP offer (caller side)
    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        await this.peerConnection.setLocalDescription(offer);
        console.log('[WebRTC] Created offer');
        return offer;
    }

    // Create SDP answer (callee side)
    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        console.log('[WebRTC] Created answer');
        return answer;
    }

    // Handle incoming SDP offer
    async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            await this.initializePeerConnection();
        }

        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
        this.isRemoteDescriptionSet = true;
        console.log('[WebRTC] Set remote description (offer)');

        // Process queued ICE candidates
        await this.processIceCandidateQueue();
    }

    // Handle incoming SDP answer
    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.isRemoteDescriptionSet = true;
        console.log('[WebRTC] Set remote description (answer)');

        // Process queued ICE candidates
        await this.processIceCandidateQueue();
    }

    // Add ICE candidate from remote peer
    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) {
            console.warn('[WebRTC] No peer connection, queuing ICE candidate');
            this.iceCandidateQueue.push(candidate);
            return;
        }

        if (!this.isRemoteDescriptionSet) {
            console.log('[WebRTC] Remote description not set, queuing ICE candidate');
            this.iceCandidateQueue.push(candidate);
            return;
        }

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Added ICE candidate');
        } catch (error) {
            console.error('[WebRTC] Failed to add ICE candidate:', error);
        }
    }

    // Process queued ICE candidates
    private async processIceCandidateQueue(): Promise<void> {
        console.log(`[WebRTC] Processing ${this.iceCandidateQueue.length} queued ICE candidates`);

        while (this.iceCandidateQueue.length > 0) {
            const candidate = this.iceCandidateQueue.shift()!;
            try {
                await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('[WebRTC] Failed to add queued ICE candidate:', error);
            }
        }
    }

    // Toggle audio mute
    toggleAudio(): boolean {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return true;
    }

    // Toggle video
    toggleVideo(): boolean {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return true;
    }

    // Get local stream
    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    // Get remote stream
    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    // Cleanup / end call
    cleanup() {
        console.log('[WebRTC] Cleaning up');

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.remoteStream) {
            this.remoteStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.iceCandidateQueue = [];
        this.isRemoteDescriptionSet = false;
    }
}

// Singleton instance
export const webRTCService = new WebRTCService();
export default webRTCService;
