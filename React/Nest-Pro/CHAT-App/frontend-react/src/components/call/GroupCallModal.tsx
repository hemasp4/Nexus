import { useState, useEffect } from 'react';

interface GroupCallIncoming {
    roomId: string;
    callId: string;
    initiatorId: string;
    initiatorName: string;
    callType: 'voice' | 'video';
}

interface GroupCallModalProps {
    sendMessage: (data: object) => void;
}

export function GroupCallModal({ sendMessage }: GroupCallModalProps) {
    const [incomingCall, setIncomingCall] = useState<GroupCallIncoming | null>(null);
    const [isInGroupCall, setIsInGroupCall] = useState(false);
    const [participants, setParticipants] = useState<string[]>([]);
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

    useEffect(() => {
        const handleIncoming = (e: CustomEvent<GroupCallIncoming>) => {
            setIncomingCall(e.detail);
        };

        const handleJoined = (e: CustomEvent) => {
            setParticipants(e.detail.participants || []);
        };

        const handleLeft = (e: CustomEvent) => {
            setParticipants(e.detail.participants || []);
            if (e.detail.participants?.length === 0) {
                endGroupCall();
            }
        };

        // Handle starting a group call from chat header
        const handleStartGroupCall = (e: CustomEvent) => {
            const { roomId, callType, callId } = e.detail;
            sendMessage({
                type: 'group_call_start',
                room_id: roomId,
                call_type: callType,
                call_id: callId
            });
            setCurrentRoomId(roomId);
            setIsInGroupCall(true);
            setParticipants([]);  // Will be updated when participants join
        };

        window.addEventListener('groupCallIncoming', handleIncoming as EventListener);
        window.addEventListener('groupCallParticipantJoined', handleJoined as EventListener);
        window.addEventListener('groupCallParticipantLeft', handleLeft as EventListener);
        window.addEventListener('startGroupCall', handleStartGroupCall as EventListener);

        return () => {
            window.removeEventListener('groupCallIncoming', handleIncoming as EventListener);
            window.removeEventListener('groupCallParticipantJoined', handleJoined as EventListener);
            window.removeEventListener('groupCallParticipantLeft', handleLeft as EventListener);
            window.removeEventListener('startGroupCall', handleStartGroupCall as EventListener);
        };
    }, [sendMessage]);

    const acceptGroupCall = () => {
        if (!incomingCall) return;

        sendMessage({
            type: 'group_call_join',
            room_id: incomingCall.roomId
        });

        setCurrentRoomId(incomingCall.roomId);
        setIsInGroupCall(true);
        setIncomingCall(null);
    };

    const declineGroupCall = () => {
        setIncomingCall(null);
    };

    const endGroupCall = () => {
        if (currentRoomId) {
            sendMessage({
                type: 'group_call_leave',
                room_id: currentRoomId
            });
        }
        setIsInGroupCall(false);
        setCurrentRoomId(null);
        setParticipants([]);
    };

    // Incoming call modal
    if (incomingCall) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3a 100%)',
                    borderRadius: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    minWidth: '320px'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="40" height="40" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>

                    <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>
                        Group {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
                    </h3>
                    <p style={{ color: '#888', marginBottom: '30px' }}>
                        {incomingCall.initiatorName} started a call
                    </p>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button
                            onClick={declineGroupCall}
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <button
                            onClick={acceptGroupCall}
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active group call UI
    if (isInGroupCall) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 9999
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '20px',
                            justifyContent: 'center',
                            marginBottom: '40px'
                        }}>
                            {participants.map((p, i) => (
                                <div key={p} style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    background: `hsl(${i * 60}, 70%, 50%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '40px',
                                    color: '#fff'
                                }}>
                                    {p.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <p style={{ color: '#fff', fontSize: '18px' }}>
                            {participants.length} participant{participants.length !== 1 ? 's' : ''} in call
                        </p>
                    </div>
                </div>

                <div style={{
                    padding: '30px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px'
                }}>
                    <button
                        onClick={endGroupCall}
                        style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.07 8.18 2 2 0 0 1 5 6h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
