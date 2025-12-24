/**
 * NexusChat - Call History Handler
 * Displays call history with audio/video icons
 */

// Call history state
let callHistory = [];

// Load call history
async function loadCallHistory() {
    try {
        const response = await fetch(`${API_URL}/api/calls`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            callHistory = await response.json();
            renderCallHistory();
        }
    } catch (error) {
        console.error('Failed to load call history:', error);
        showToast('Failed to load call history', 'error');
    }
}

// Render call history in sidebar
function renderCallHistory() {
    const contactList = document.getElementById('contactList');
    if (!contactList) return;

    if (callHistory.length === 0) {
        contactList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
                    </path>
                </svg>
                <p class="text-lg font-medium">No calls yet</p>
                <p class="text-sm mt-1">Your call history will appear here</p>
            </div>
        `;
        return;
    }

    contactList.innerHTML = callHistory.map(call => {
        const isOutgoing = call.is_outgoing;
        const otherPersonId = isOutgoing ? call.callee_id : call.caller_id;
        const otherPersonName = isOutgoing ? call.callee_name : call.caller_name;
        const callTime = formatCallTime(call.timestamp);
        const duration = formatDuration(call.duration);

        // Determine call status icon and color
        let statusIcon, statusColor;
        if (call.status === 'completed') {
            statusIcon = isOutgoing ? '↗' : '↙';
            statusColor = 'text-green-400';
        } else if (call.status === 'missed') {
            statusIcon = '↙';
            statusColor = 'text-red-400';
        } else if (call.status === 'rejected' || call.status === 'cancelled') {
            statusIcon = isOutgoing ? '↗' : '↙';
            statusColor = 'text-red-400';
        } else {
            statusIcon = '•';
            statusColor = 'text-gray-400';
        }

        // Call type icon (audio/video)
        const callTypeIcon = call.call_type === 'video'
            ? `<svg class="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z">
                </path>
               </svg>`
            : `<svg class="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
                </path>
               </svg>`;

        return `
            <div class="call-history-item" data-call-id="${call.id}" onclick="initiateCall('${otherPersonId}', '${call.call_type}')">
                <div class="call-avatar">
                    <div class="avatar-placeholder">${otherPersonName.charAt(0).toUpperCase()}</div>
                </div>
                <div class="call-info">
                    <div class="call-name">${otherPersonName}</div>
                    <div class="call-details ${statusColor}">
                        <span>${statusIcon}</span>
                        <span>${callTime}</span>
                        ${call.status === 'completed' && duration ? `<span>• ${duration}</span>` : ''}
                    </div>
                </div>
                <div class="call-action">
                    ${callTypeIcon}
                </div>
            </div>
        `;
    }).join('');
}

// Format call timestamp
function formatCallTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * oneDay) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Format call duration
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

// Initiate call from history
function initiateCall(userId, callType) {
    AppState.currentChat = userId;
    if (typeof startCall === 'function') {
        startCall(callType);
    }
}

// Log a call when it ends
async function logCall(calleeId, callType, status, duration = 0) {
    try {
        await fetch(`${API_URL}/api/calls`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callee_id: calleeId,
                call_type: callType,
                status: status,
                duration: duration
            })
        });
    } catch (error) {
        console.error('Failed to log call:', error);
    }
}

// Clear call history
async function clearCallHistory() {
    if (!confirm('Are you sure you want to clear all call history?')) return;

    try {
        const response = await fetch(`${API_URL}/api/calls`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            callHistory = [];
            renderCallHistory();
            showToast('Call history cleared', 'success');
        }
    } catch (error) {
        showToast('Failed to clear call history', 'error');
    }
}

// Export functions
window.loadCallHistory = loadCallHistory;
window.logCall = logCall;
window.clearCallHistory = clearCallHistory;
window.initiateCall = initiateCall;
