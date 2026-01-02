import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../../stores/callStore';

export function CallModal() {
    const {
        isInCall,
        callState,
        activeCall,
        isMuted,
        isVideoEnabled,
        localStream,
        remoteStream,
        endCall,
        toggleMute,
        toggleVideo
    } = useCallStore();

    const [callDuration, setCallDuration] = useState(0);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Set local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Set remote video stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Handle call duration timer
    useEffect(() => {
        if (callState === 'connected' && !timerRef.current) {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [callState]);

    // Reset duration when call ends
    useEffect(() => {
        if (!isInCall) {
            setCallDuration(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isInCall]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallStateText = () => {
        switch (callState) {
            case 'calling': return 'Calling...';
            case 'ringing': return 'Ringing...';
            case 'connecting': return 'Connecting...';
            case 'connected': return formatDuration(callDuration);
            case 'ended': return 'Call ended';
            default: return '';
        }
    };

    if (!isInCall || !activeCall) return null;

    const isVideoCall = activeCall.callType === 'video';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: isVideoCall ? '#000' : 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 20px'
        }}>
            {/* Video Call - Remote Video Background */}
            {isVideoCall && (
                <>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            background: '#000'
                        }}
                    />
                    {/* Local Video - Picture in Picture */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '120px',
                            height: '180px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            background: '#333',
                            border: '2px solid rgba(255,255,255,0.2)',
                            zIndex: 10
                        }}
                    />
                </>
            )}

            {/* Audio Call - Contact Info */}
            {!isVideoCall && (
                <div style={{ textAlign: 'center', zIndex: 5, marginTop: '60px' }}>
                    <div style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        margin: '0 auto 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '60px',
                        color: '#fff',
                        overflow: 'hidden'
                    }}>
                        {activeCall.peerAvatar ? (
                            <img
                                src={activeCall.peerAvatar}
                                alt={activeCall.peerName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            activeCall.peerName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 600, margin: '0 0 8px' }}>
                        {activeCall.peerName}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
                        {getCallStateText()}
                    </p>
                </div>
            )}

            {/* Video Call - Overlay Info */}
            {isVideoCall && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 10,
                    color: '#fff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{activeCall.peerName}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>{getCallStateText()}</p>
                </div>
            )}

            {/* Call Controls */}
            <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                zIndex: 10,
                marginBottom: isVideoCall ? '40px' : 0
            }}>
                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )}
                </button>

                {/* End Call Button */}
                <button
                    onClick={endCall}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.2s'
                    }}
                    title="End Call"
                >
                    <svg width="32" height="32" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                </button>

                {/* Video Toggle (for video calls) */}
                {isVideoCall && (
                    <button
                        onClick={toggleVideo}
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: !isVideoEnabled ? '#ef4444' : 'rgba(255,255,255,0.2)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                        {isVideoEnabled ? (
                            <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
