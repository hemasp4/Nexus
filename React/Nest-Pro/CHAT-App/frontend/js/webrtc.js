/**
 * NexusChat - WebRTC Handler
 * Handles audio/video calling
 */

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCallId = null;
let currentCallType = null;

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Start a call
async function startCall(type = 'audio') {
    if (!AppState.currentChat) return;
    currentCallType = type;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true, video: type === 'video'
        });

        peerConnection = new RTCPeerConnection(iceServers);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.ontrack = (e) => {
            document.getElementById('remoteVideo').srcObject = e.streams[0];
        };

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) sendWsMessage({ type: 'ice_candidate', call_id: currentCallId, candidate: e.candidate });
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        sendWsMessage({ type: 'call_offer', callee_id: AppState.currentChat, sdp: offer.sdp, call_type: type });
        showCallUI(type);
    } catch (err) {
        showToast('Failed to start call', 'error');
    }
}

function handleCallOffer(data) {
    currentCallId = data.call_id;
    currentCallType = data.call_type;
    document.getElementById('callOverlay').classList.remove('hidden');
    document.getElementById('callStatus').textContent = 'Incoming call...';
}

async function handleCallAnswer(data) {
    if (peerConnection) {
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    }
}

async function handleIceCandidate(data) {
    if (peerConnection) await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
}

function handleCallEnded() { cleanupCall(); }

function showCallUI(type) {
    document.getElementById('callOverlay').classList.remove('hidden');
    if (type === 'video') document.getElementById('localVideo').srcObject = localStream;
}

function endCall() {
    sendWsMessage({ type: 'call_end', call_id: currentCallId });
    cleanupCall();
}

function cleanupCall() {
    localStream?.getTracks().forEach(t => t.stop());
    peerConnection?.close();
    localStream = peerConnection = null;
    document.getElementById('callOverlay').classList.add('hidden');
    document.getElementById('videoContainer').classList.add('hidden');
}

document.getElementById('endCallBtn')?.addEventListener('click', endCall);
document.getElementById('videoEndBtn')?.addEventListener('click', endCall);

window.startCall = startCall;
window.handleCallOffer = handleCallOffer;
window.handleCallAnswer = handleCallAnswer;
window.handleIceCandidate = handleIceCandidate;
window.handleCallEnded = handleCallEnded;
