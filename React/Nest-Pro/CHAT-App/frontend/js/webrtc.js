/**
 * NexusChat - WebRTC Handler
 * Handles audio/video calling with full features
 */

// State
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let screenStream = null;
let currentCallId = null;
let currentCallType = null;
let callState = 'idle'; // idle, outgoing, incoming, connected
let isMuted = false;
let isVideoOff = false;
let isScreenSharing = false;
let currentCameraFacing = 'user'; // 'user' or 'environment'
let callTimeout = null;
let callTimerInterval = null;
let callDuration = 0;

const CALL_TIMEOUT_MS = 10000; // 10 seconds

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Initialize call UI listeners
document.addEventListener('DOMContentLoaded', initCallListeners);

function initCallListeners() {
    // Outgoing call controls
    document.getElementById('cancelCallBtn')?.addEventListener('click', cancelCall);

    // Incoming call controls
    document.getElementById('acceptCallBtn')?.addEventListener('click', acceptCall);
    document.getElementById('rejectCallBtn')?.addEventListener('click', rejectCall);

    // Connected call controls
    document.getElementById('muteBtn')?.addEventListener('click', toggleMute);
    document.getElementById('videoToggleBtn')?.addEventListener('click', toggleVideo);
    document.getElementById('endCallBtn')?.addEventListener('click', endCall);
    document.getElementById('screenShareBtn')?.addEventListener('click', toggleScreenShare);
    document.getElementById('flipCameraBtn')?.addEventListener('click', flipCamera);

    // Video container controls
    document.getElementById('videoMuteBtn')?.addEventListener('click', toggleMute);
    document.getElementById('videoEndBtn')?.addEventListener('click', endCall);
    document.getElementById('videoCamToggleBtn')?.addEventListener('click', toggleVideo);
    document.getElementById('videoScreenShareBtn')?.addEventListener('click', toggleScreenShare);
    document.getElementById('videoFlipCameraBtn')?.addEventListener('click', flipCamera);
}

// Start a call (as caller)
async function startCall(type = 'audio') {
    if (!AppState.currentChat) {
        showToast('Select a contact first', 'error');
        return;
    }

    currentCallType = type;
    callState = 'outgoing';
    currentCallId = Date.now().toString();

    try {
        // Get local media
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video'
        });

        // Setup peer connection
        setupPeerConnection();

        // Add tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send call offer
        sendWsMessage({
            type: 'call_offer',
            call_id: currentCallId,
            callee_id: AppState.currentChat,
            sdp: offer.sdp,
            call_type: type
        });

        // Show outgoing call UI
        showOutgoingCallUI();

        // Set 10 second timeout
        callTimeout = setTimeout(() => {
            if (callState === 'outgoing') {
                showToast('No answer', 'info');
                endCall();
            }
        }, CALL_TIMEOUT_MS);

    } catch (err) {
        console.error('Failed to start call:', err);
        showToast('Failed to start call: ' + err.message, 'error');
        cleanupCall();
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.ontrack = (event) => {
        console.log('Remote track received');
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendWsMessage({
                type: 'ice_candidate',
                call_id: currentCallId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            onCallConnected();
        } else if (peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'failed') {
            endCall();
        }
    };
}

function showOutgoingCallUI() {
    const contact = AppState.contacts.find(c => c.id === AppState.currentChat);

    document.getElementById('callName').textContent = contact?.username || 'User';
    document.getElementById('callAvatarText').textContent = (contact?.username || 'U').charAt(0).toUpperCase();
    document.getElementById('callStatus').textContent = 'Calling...';
    document.getElementById('callTimer').classList.add('hidden');

    document.getElementById('outgoingCallControls').classList.remove('hidden');
    document.getElementById('incomingCallControls').classList.add('hidden');
    document.getElementById('connectedCallControls').classList.add('hidden');

    document.getElementById('callOverlay').classList.remove('hidden');

    if (currentCallType === 'video') {
        document.getElementById('localVideo').srcObject = localStream;
    }
}

function showIncomingCallUI(callerName) {
    document.getElementById('callName').textContent = callerName || 'User';
    document.getElementById('callAvatarText').textContent = (callerName || 'U').charAt(0).toUpperCase();
    document.getElementById('callStatus').textContent = 'Incoming call...';
    document.getElementById('callTimer').classList.add('hidden');

    document.getElementById('outgoingCallControls').classList.add('hidden');
    document.getElementById('incomingCallControls').classList.remove('hidden');
    document.getElementById('connectedCallControls').classList.add('hidden');

    document.getElementById('callOverlay').classList.remove('hidden');

    // Auto-reject after 10 seconds
    callTimeout = setTimeout(() => {
        if (callState === 'incoming') {
            showToast('Missed call', 'info');
            rejectCall();
        }
    }, CALL_TIMEOUT_MS);
}

function showConnectedCallUI() {
    document.getElementById('callStatus').classList.add('hidden');
    document.getElementById('callTimer').classList.remove('hidden');

    document.getElementById('outgoingCallControls').classList.add('hidden');
    document.getElementById('incomingCallControls').classList.add('hidden');
    document.getElementById('connectedCallControls').classList.remove('hidden');

    if (currentCallType === 'video') {
        document.getElementById('callOverlay').classList.add('hidden');
        document.getElementById('videoContainer').classList.remove('hidden');
        document.getElementById('localVideo').srcObject = localStream;
    }
}

function onCallConnected() {
    clearTimeout(callTimeout);
    callState = 'connected';
    callDuration = 0;

    showConnectedCallUI();
    startCallTimer();
}

function startCallTimer() {
    callTimerInterval = setInterval(() => {
        callDuration++;
        const mins = Math.floor(callDuration / 60).toString().padStart(2, '0');
        const secs = (callDuration % 60).toString().padStart(2, '0');
        const timeStr = `${mins}:${secs}`;

        document.getElementById('callTimer').textContent = timeStr;
        document.getElementById('videoTimer').textContent = timeStr;
    }, 1000);
}

// Handle incoming call offer
async function handleCallOffer(data) {
    if (callState !== 'idle') {
        // Already in a call, send busy
        sendWsMessage({ type: 'call_busy', call_id: data.call_id, caller_id: data.caller_id });
        return;
    }

    currentCallId = data.call_id;
    currentCallType = data.call_type;
    callState = 'incoming';

    // Store the offer for when we accept
    window.pendingOffer = data;

    showIncomingCallUI(data.caller_name);
}

// Accept incoming call
async function acceptCall() {
    clearTimeout(callTimeout);

    const data = window.pendingOffer;
    if (!data) return;

    try {
        // Get local media
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: currentCallType === 'video'
        });

        // Setup peer connection
        setupPeerConnection();

        // Add tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Set remote description (the offer)
        await peerConnection.setRemoteDescription({
            type: 'offer',
            sdp: data.sdp
        });

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer
        sendWsMessage({
            type: 'call_answer',
            call_id: currentCallId,
            caller_id: data.caller_id,
            sdp: answer.sdp
        });

        callState = 'connected';
        onCallConnected();

    } catch (err) {
        console.error('Failed to accept call:', err);
        showToast('Failed to accept call', 'error');
        cleanupCall();
    }
}

// Reject incoming call
function rejectCall() {
    clearTimeout(callTimeout);
    sendWsMessage({ type: 'call_rejected', call_id: currentCallId });
    cleanupCall();
}

// Cancel outgoing call
function cancelCall() {
    clearTimeout(callTimeout);
    sendWsMessage({ type: 'call_cancelled', call_id: currentCallId });
    cleanupCall();
}

// Handle call answer
async function handleCallAnswer(data) {
    if (peerConnection && callState === 'outgoing') {
        clearTimeout(callTimeout);
        await peerConnection.setRemoteDescription({
            type: 'answer',
            sdp: data.sdp
        });
        callState = 'connected';
        onCallConnected();
    }
}

// Handle ICE candidate
async function handleIceCandidate(data) {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    }
}

// Handle call ended by other party
function handleCallEnded(data) {
    showToast('Call ended', 'info');
    cleanupCall();
}

// End call
function endCall() {
    sendWsMessage({ type: 'call_end', call_id: currentCallId });
    cleanupCall();
}

// Toggle mute
function toggleMute() {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        isMuted = !audioTrack.enabled;

        // Update UI
        document.querySelectorAll('.unmuted').forEach(el => el.classList.toggle('hidden', isMuted));
        document.querySelectorAll('.muted').forEach(el => el.classList.toggle('hidden', !isMuted));

        document.getElementById('muteBtn')?.classList.toggle('active', isMuted);
        document.getElementById('videoMuteBtn')?.classList.toggle('active', isMuted);
    }
}

// Toggle video
function toggleVideo() {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isVideoOff = !videoTrack.enabled;

        // Update UI
        document.querySelectorAll('.video-on').forEach(el => el.classList.toggle('hidden', isVideoOff));
        document.querySelectorAll('.video-off').forEach(el => el.classList.toggle('hidden', !isVideoOff));

        document.getElementById('videoToggleBtn')?.classList.toggle('active', isVideoOff);
        document.getElementById('videoCamToggleBtn')?.classList.toggle('active', isVideoOff);
    }
}

// Toggle screen sharing
async function toggleScreenShare() {
    if (isScreenSharing) {
        // Stop screen share, revert to camera
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }

        // Get camera again
        const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true, audio: false
        });

        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            await sender.replaceTrack(videoTrack);
        }

        document.getElementById('localVideo').srcObject = new MediaStream([...localStream.getAudioTracks(), videoTrack]);
        isScreenSharing = false;

        document.getElementById('screenShareBtn')?.classList.remove('active');
        document.getElementById('videoScreenShareBtn')?.classList.remove('active');

        showToast('Screen sharing stopped', 'info');
    } else {
        // Start screen share
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');

            if (sender) {
                await sender.replaceTrack(screenTrack);
            }

            // Handle screen share stopped by user
            screenTrack.onended = () => {
                toggleScreenShare();
            };

            document.getElementById('localVideo').srcObject = screenStream;
            isScreenSharing = true;

            document.getElementById('screenShareBtn')?.classList.add('active');
            document.getElementById('videoScreenShareBtn')?.classList.add('active');

            showToast('Screen sharing started', 'success');
        } catch (err) {
            console.error('Screen share error:', err);
            showToast('Failed to share screen', 'error');
        }
    }
}

// Flip camera (front/back)
async function flipCamera() {
    if (!localStream || currentCallType !== 'video') return;

    try {
        // Toggle facing mode
        currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';

        // Get new camera stream
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCameraFacing },
            audio: false
        });

        const newVideoTrack = newStream.getVideoTracks()[0];

        // Replace track in peer connection
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            await sender.replaceTrack(newVideoTrack);
        }

        // Stop old video track
        localStream.getVideoTracks().forEach(track => track.stop());

        // Update local stream
        localStream = new MediaStream([...localStream.getAudioTracks(), newVideoTrack]);
        document.getElementById('localVideo').srcObject = localStream;

        showToast(`Switched to ${currentCameraFacing === 'user' ? 'front' : 'back'} camera`, 'success');
    } catch (err) {
        console.error('Camera flip error:', err);
        showToast('Failed to flip camera', 'error');
    }
}

// Cleanup after call ends
function cleanupCall() {
    clearTimeout(callTimeout);
    clearInterval(callTimerInterval);

    // Stop all streams
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }
    if (remoteStream) {
        remoteStream = null;
    }

    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Reset state
    callState = 'idle';
    currentCallId = null;
    isMuted = false;
    isVideoOff = false;
    isScreenSharing = false;
    callDuration = 0;
    window.pendingOffer = null;

    // Hide UI
    document.getElementById('callOverlay')?.classList.add('hidden');
    document.getElementById('videoContainer')?.classList.add('hidden');

    // Reset UI elements
    document.getElementById('callTimer').textContent = '00:00';
    document.getElementById('videoTimer').textContent = '00:00';
    document.getElementById('callStatus').classList.remove('hidden');
}

// Export functions
window.startCall = startCall;
window.handleCallOffer = handleCallOffer;
window.handleCallAnswer = handleCallAnswer;
window.handleIceCandidate = handleIceCandidate;
window.handleCallEnded = handleCallEnded;
window.endCall = endCall;
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
