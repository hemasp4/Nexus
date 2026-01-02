import { useEffect } from 'react';
import { useCallStore } from '../../stores/callStore';

export function CallHistory() {
    const { callHistory, isLoadingHistory, loadCallHistory, initiateCall } = useCallStore();

    useEffect(() => {
        loadCallHistory();
    }, [loadCallHistory]);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffHours < 1) {
            const mins = Math.floor(diffMs / (1000 * 60));
            return `${mins}m ago`;
        } else if (diffHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds || seconds === 0) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallIcon = (status: string, direction: string, call_type: string) => {
        if (status === 'missed') {
            return (
                <svg className="call-icon missed" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                    <path d="M5.59 3.41L2 7l3.59 3.59L7 9.17 4.83 7 7 4.83z" />
                </svg>
            );
        }
        if (direction === 'outgoing') {
            return (
                <svg className="call-icon outgoing" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5H9z" />
                </svg>
            );
        }
        return (
            <svg className="call-icon incoming" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41L20 5.41z" />
            </svg>
        );
    };

    if (isLoadingHistory) {
        return (
            <div className="call-history loading">
                <div className="loading-spinner"></div>
                <p>Loading call history...</p>
            </div>
        );
    }

    if (callHistory.length === 0) {
        return (
            <div className="call-history empty">
                <div className="empty-icon">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </div>
                <h3>No calls yet</h3>
                <p>Your call history will appear here</p>
            </div>
        );
    }

    return (
        <div className="call-history">
            {callHistory.map((call) => (
                <div key={call.id} className="call-item">
                    <div className="call-avatar">
                        {call.participantAvatar ? (
                            <img src={call.participantAvatar} alt={call.participantName} />
                        ) : (
                            <div className="avatar-placeholder">
                                {call.participantName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="call-info">
                        <div className="call-details">
                            <span className="call-name">{call.participantName}</span>
                            <div className="call-meta">
                                {getCallIcon(call.status, call.direction, call.call_type)}
                                <span className={`call-status ${call.status}`}>
                                    {call.status === 'missed' ? 'Missed' :
                                        call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                                </span>
                                {call.duration && (
                                    <span className="call-duration">{formatDuration(call.duration)}</span>
                                )}
                            </div>
                        </div>
                        <span className="call-time">{formatTime(call.timestamp)}</span>
                    </div>

                    <div className="call-actions">
                        <button
                            className="call-action-btn"
                            onClick={() => initiateCall(
                                call.participantId,
                                call.participantName,
                                call.participantAvatar,
                                'voice'
                            )}
                            title="Voice Call"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </button>
                        <button
                            className="call-action-btn"
                            onClick={() => initiateCall(
                                call.participantId,
                                call.participantName,
                                call.participantAvatar,
                                'video'
                            )}
                            title="Video Call"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
