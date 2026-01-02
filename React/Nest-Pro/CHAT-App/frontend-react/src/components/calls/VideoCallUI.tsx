import { useEffect, useState } from 'react';
import { useCallStore } from '../../stores/callStore';

export function VideoCallUI() {
    const {
        isInCall,
        activeCall,
        isMuted,
        isVideoEnabled,
        isSpeakerOn,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        endCall
    } = useCallStore();

    const [callDuration, setCallDuration] = useState(0);

    // Update call duration every second
    useEffect(() => {
        if (!isInCall || !activeCall?.startTime) return;

        const interval = setInterval(() => {
            const duration = Math.floor((Date.now() - activeCall.startTime!.getTime()) / 1000);
            setCallDuration(duration);
        }, 1000);

        return () => clearInterval(interval);
    }, [isInCall, activeCall?.startTime]);

    if (!isInCall || !activeCall) return null;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-call-overlay">
            <div className={`video-call-container ${activeCall.callType}`}>
                {/* Main Video / Avatar Area */}
                <div className="call-main-view">
                    {activeCall.callType === 'video' && isVideoEnabled ? (
                        <video className="remote-video" autoPlay playsInline>
                            {/* Remote video stream would be attached here */}
                        </video>
                    ) : (
                        <div className="call-avatar-large">
                            {activeCall.peerAvatar ? (
                                <img src={activeCall.peerAvatar} alt={activeCall.peerName} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {activeCall.peerName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Call Info */}
                <div className="call-info-bar">
                    <h2>{activeCall.peerName}</h2>
                    <span className="call-timer">{formatDuration(callDuration)}</span>
                </div>

                {/* Self View (for video calls) */}
                {activeCall.callType === 'video' && (
                    <div className="self-video-container">
                        <video className="self-video" autoPlay muted playsInline>
                            {/* Local video stream would be attached here */}
                        </video>
                    </div>
                )}

                {/* Call Controls */}
                <div className="call-controls">
                    {/* Mute Button */}
                    <button
                        className={`call-control-btn ${isMuted ? 'active' : ''}`}
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    {/* Video Toggle (only for video calls) */}
                    {activeCall.callType === 'video' && (
                        <button
                            className={`call-control-btn ${!isVideoEnabled ? 'active' : ''}`}
                            onClick={toggleVideo}
                            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {isVideoEnabled ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* Speaker Toggle */}
                    <button
                        className={`call-control-btn ${isSpeakerOn ? 'active' : ''}`}
                        onClick={toggleSpeaker}
                        title={isSpeakerOn ? 'Speaker off' : 'Speaker on'}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>

                    {/* End Call Button */}
                    <button
                        className="call-control-btn end-call"
                        onClick={endCall}
                        title="End call"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Incoming Call Component
export function IncomingCallUI() {
    const { incomingCall, acceptCall, declineCall } = useCallStore();

    if (!incomingCall) return null;

    return (
        <div className="incoming-call-overlay">
            <div className="incoming-call-card">
                <div className="incoming-call-avatar">
                    {incomingCall.fromAvatar ? (
                        <img src={incomingCall.fromAvatar} alt={incomingCall.fromName} />
                    ) : (
                        <div className="avatar-placeholder">
                            {incomingCall.fromName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <h2>{incomingCall.fromName}</h2>
                <p>Incoming {incomingCall.callType} call...</p>

                <div className="incoming-call-actions">
                    <button className="decline-btn" onClick={declineCall}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <button className="accept-btn" onClick={acceptCall}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
