import { useCallStore } from '../../stores/callStore';

export function IncomingCallModal() {
    const { incomingCall, acceptCall, declineCall } = useCallStore();

    if (!incomingCall) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
                borderRadius: '24px',
                padding: '40px',
                textAlign: 'center',
                minWidth: '320px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Caller Avatar */}
                <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    margin: '0 auto 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    color: '#fff',
                    animation: 'pulse 2s infinite',
                    overflow: 'hidden'
                }}>
                    {incomingCall.fromAvatar ? (
                        <img
                            src={incomingCall.fromAvatar}
                            alt={incomingCall.fromName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        incomingCall.fromName.charAt(0).toUpperCase()
                    )}
                </div>

                {/* Caller Name */}
                <h2 style={{
                    color: '#fff',
                    fontSize: '24px',
                    fontWeight: 600,
                    margin: '0 0 8px'
                }}>
                    {incomingCall.fromName}
                </h2>

                {/* Call Type */}
                <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '16px',
                    margin: '0 0 32px'
                }}>
                    Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
                </p>

                {/* Call Actions */}
                <div style={{
                    display: 'flex',
                    gap: '24px',
                    justifyContent: 'center'
                }}>
                    {/* Decline Button */}
                    <button
                        onClick={declineCall}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Accept Button */}
                    <button
                        onClick={acceptCall}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#22c55e',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                </div>

                {/* Pulse Animation */}
                <style>{`
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                        70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                    }
                `}</style>
            </div>
        </div>
    );
}
