/**
 * NexusChat - Status Handler
 * WhatsApp-style Status/Stories feature
 */

// Status state
let statusState = {
    myStatuses: [],
    contactStatuses: {
        recent: [],
        viewed: []
    },
    currentViewingUser: null,
    currentStatusIndex: 0,
    statusTimer: null
};

// Initialize status
document.addEventListener('DOMContentLoaded', () => {
    // Status will be initialized when status tab is clicked
});

// Load status view (called when Status tab is clicked)
async function loadStatusView() {
    document.getElementById('sidebarTitle').textContent = 'Status';

    const contactList = document.getElementById('contactList');
    if (!contactList) return;

    // Show loading
    contactList.innerHTML = '<div class="flex justify-center py-8"><div class="loader-spinner"></div></div>';

    // Load my statuses and contact statuses
    await Promise.all([
        loadMyStatuses(),
        loadContactStatuses()
    ]);

    // Render status list
    renderStatusList();

    // Show status placeholder in main area
    showStatusPlaceholder();
}

// Load my statuses
async function loadMyStatuses() {
    try {
        const response = await fetch(`${API_URL}/api/status/my`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            statusState.myStatuses = await response.json();
        }
    } catch (error) {
        console.error('Failed to load my statuses:', error);
    }
}

// Load contact statuses
async function loadContactStatuses() {
    try {
        const response = await fetch(`${API_URL}/api/status/contacts`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            statusState.contactStatuses = await response.json();
        }
    } catch (error) {
        console.error('Failed to load contact statuses:', error);
    }
}

// Render status list in sidebar
function renderStatusList() {
    const contactList = document.getElementById('contactList');
    if (!contactList) return;

    const { myStatuses, contactStatuses } = statusState;
    const hasMyStatus = myStatuses.length > 0;

    let html = `
        <!-- My Status -->
        <div class="status-item my-status">
            <div class="status-avatar ${hasMyStatus ? 'has-status' : ''}" onclick="handleMyStatusClick()">
                <div class="avatar-placeholder">${(AppState.user?.username || 'U').charAt(0).toUpperCase()}</div>
                ${!hasMyStatus ? '<div class="status-add-btn">+</div>' : ''}
            </div>
            <div class="status-info" onclick="handleMyStatusClick()">
                <div class="status-name">My status</div>
                <div class="status-time">${hasMyStatus ? 'Tap to view' : 'Tap to add status update'}</div>
            </div>
            <div class="status-options-btn" onclick="showStatusOptionsDropdown(event)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
            </div>
        </div>
    `;

    // Recent updates
    if (contactStatuses.recent && contactStatuses.recent.length > 0) {
        html += '<div class="status-section-title">Recent updates</div>';

        contactStatuses.recent.forEach(contact => {
            html += createStatusContactItem(contact, false);
        });
    }

    // Viewed updates
    if (contactStatuses.viewed && contactStatuses.viewed.length > 0) {
        html += '<div class="status-section-title">Viewed updates</div>';

        contactStatuses.viewed.forEach(contact => {
            html += createStatusContactItem(contact, true);
        });
    }

    // Empty state
    if ((!contactStatuses.recent || contactStatuses.recent.length === 0) &&
        (!contactStatuses.viewed || contactStatuses.viewed.length === 0)) {
        html += `
            <div class="status-empty">
                <p class="text-gray-500 text-sm">No status updates from contacts</p>
            </div>
        `;
    }

    contactList.innerHTML = html;
}

// Create status contact item HTML
function createStatusContactItem(contact, viewed) {
    const time = formatStatusTime(contact.latest_time);

    return `
        <div class="status-item" onclick="viewContactStatus('${contact.user_id}')">
            <div class="status-avatar ${viewed ? 'viewed' : 'has-status'}">
                ${contact.avatar
            ? `<img src="${API_URL}/api/files/${contact.avatar}" alt="${contact.username}">`
            : `<div class="avatar-placeholder">${contact.username.charAt(0).toUpperCase()}</div>`
        }
                ${contact.status_count > 1 ? `<div class="status-count">${contact.status_count}</div>` : ''}
            </div>
            <div class="status-info">
                <div class="status-name">${contact.username}</div>
                <div class="status-time">${time}</div>
            </div>
        </div>
    `;
}

// Format status time
function formatStatusTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Show status placeholder in main area
function showStatusPlaceholder() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    chatArea.innerHTML = `
        <div class="status-viewer-placeholder">
            <div class="status-viewer-content">
                <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <p class="text-gray-400 text-lg">Click on a contact to view their status updates</p>
            </div>
            <div class="status-footer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <span>Status updates are end-to-end encrypted</span>
            </div>
        </div>
    `;
}

// Handle my status click
function handleMyStatusClick() {
    if (statusState.myStatuses.length > 0) {
        // View my own statuses
        viewMyStatuses();
    } else {
        // Create new status
        showCreateStatusModal();
    }
}

// View my statuses
function viewMyStatuses() {
    statusState.currentViewingUser = AppState.user?.id;
    statusState.currentStatusIndex = 0;

    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    displayStatuses(statusState.myStatuses, AppState.user?.username || 'Me', true);
}

// View contact status
async function viewContactStatus(userId) {
    try {
        const response = await fetch(`${API_URL}/api/status/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const statuses = await response.json();
            if (statuses.length > 0) {
                statusState.currentViewingUser = userId;
                statusState.currentStatusIndex = 0;
                displayStatuses(statuses, statuses[0].username, false);
            }
        }
    } catch (error) {
        console.error('Failed to load contact statuses:', error);
        showToast('Failed to load status', 'error');
    }
}

// Display statuses in viewer
function displayStatuses(statuses, username, isOwn) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea || statuses.length === 0) return;

    const status = statuses[statusState.currentStatusIndex];
    const isVideo = status.media_type === 'video';
    const statusUserId = status.user_id || statusState.currentViewingUser;

    // Create progress bars
    const progressBars = statuses.map((_, i) => `
        <div class="status-progress-bar ${i < statusState.currentStatusIndex ? 'viewed' : ''} ${i === statusState.currentStatusIndex ? 'active' : ''}"></div>
    `).join('');

    // Status content
    let contentHTML;
    if (status.media_id) {
        if (isVideo) {
            contentHTML = `<video id="statusVideo" src="${API_URL}/api/files/${status.media_id}" autoplay muted class="status-media"></video>`;
        } else {
            contentHTML = `<img id="statusImage" src="${API_URL}/api/files/${status.media_id}" alt="Status" class="status-media">`;
        }
    } else {
        contentHTML = `
            <div class="status-text-content" style="background: ${status.background_color}">
                <p>${status.content}</p>
            </div>
        `;
    }

    const time = formatStatusTime(status.created_at);

    chatArea.innerHTML = `
        <div class="status-viewer">
            <!-- Progress bars -->
            <div class="status-progress-container">
                ${progressBars}
            </div>
            
            <!-- Header -->
            <div class="status-viewer-header">
                <button class="status-close-btn" onclick="closeStatusViewer()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="status-viewer-user">
                    <div class="avatar-placeholder">${username.charAt(0).toUpperCase()}</div>
                    <div class="status-viewer-info">
                        <span class="status-viewer-name">${username}</span>
                        <span class="status-viewer-time">${time}</span>
                    </div>
                </div>
                
                <!-- Media Controls -->
                <div class="status-media-controls">
                    ${isVideo ? `
                        <button class="status-control-btn" onclick="toggleStatusVideo()" title="Play/Pause">
                            <svg id="playPauseIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                        <button class="status-control-btn" onclick="toggleStatusMute()" title="Mute/Unmute">
                            <svg id="muteIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                                <path id="muteLine" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="status-control-btn" onclick="screenshotStatus()" title="Screenshot">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                    ${isOwn ? `
                        <button class="status-control-btn delete" onclick="deleteCurrentStatus('${status.id}')" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <!-- Content -->
            <div class="status-content-area" onclick="handleStatusClick(event, ${statuses.length})">
                ${contentHTML}
            </div>
            
            <!-- Navigation arrows -->
            ${statusState.currentStatusIndex > 0 ? `
                <button class="status-nav-btn prev" onclick="prevStatus(event)">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
            ` : ''}
            ${statusState.currentStatusIndex < statuses.length - 1 ? `
                <button class="status-nav-btn next" onclick="nextStatus(event, ${statuses.length})">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            ` : ''}
            
            ${isOwn ? `
                <!-- Views count -->
                <div class="status-views" onclick="showStatusViews('${status.id}')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <span>${status.views || 0} views</span>
                </div>
            ` : `
                <!-- Reply box for other's status -->
                <div class="status-reply-container">
                    <button class="status-emoji-btn" onclick="toggleStatusEmojiPicker()">😊</button>
                    <input type="text" id="statusReplyInput" class="status-reply-input" placeholder="Reply to ${username}...">
                    <button class="status-send-btn" onclick="sendStatusReply('${statusUserId}', '${status.id}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
                <div id="statusEmojiPicker" class="status-emoji-picker hidden">
                    <div class="emoji-grid-simple">
                        ${['😀', '😂', '😍', '🥰', '😎', '🔥', '❤️', '👍', '👏', '🙌', '💪', '🎉'].map(e =>
        `<button class="emoji-btn-simple" onclick="insertStatusEmoji('${e}')">${e}</button>`
    ).join('')}
                    </div>
                </div>
            `}
        </div>
    `;

    // Start auto-advance timer
    startStatusTimer(statuses);
}

// Handle status click for navigation
function handleStatusClick(event, totalStatuses) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth && statusState.currentStatusIndex > 0) {
        prevStatus(event);
    } else if (clickX >= halfWidth && statusState.currentStatusIndex < totalStatuses - 1) {
        nextStatus(event, totalStatuses);
    }
}

// Previous status
function prevStatus(event) {
    event.stopPropagation();
    if (statusState.currentStatusIndex > 0) {
        statusState.currentStatusIndex--;
        refreshCurrentStatusView();
    }
}

// Next status
function nextStatus(event, totalStatuses) {
    event.stopPropagation();
    if (statusState.currentStatusIndex < totalStatuses - 1) {
        statusState.currentStatusIndex++;
        refreshCurrentStatusView();
    } else {
        closeStatusViewer();
    }
}

// Refresh current status view
async function refreshCurrentStatusView() {
    clearTimeout(statusState.statusTimer);

    if (statusState.currentViewingUser === AppState.user?.id) {
        displayStatuses(statusState.myStatuses, AppState.user?.username || 'Me', true);
    } else {
        const response = await fetch(`${API_URL}/api/status/user/${statusState.currentViewingUser}`, {
            headers: { 'Authorization': `Bearer ${AppState.token}` }
        });
        if (response.ok) {
            const statuses = await response.json();
            displayStatuses(statuses, statuses[0]?.username || 'User', false);
        }
    }
}

// Start status auto-advance timer
function startStatusTimer(statuses) {
    clearTimeout(statusState.statusTimer);

    const currentStatus = statuses[statusState.currentStatusIndex];
    const isVideo = currentStatus?.media_type === 'video';

    // Default duration: 10 seconds for images/text
    let duration = 10000;

    if (isVideo) {
        // For video, wait for it to load and get duration
        const video = document.getElementById('statusVideo');
        if (video) {
            video.onloadedmetadata = () => {
                duration = video.duration * 1000; // Convert to ms
                startProgressAnimation(duration);
                setStatusTimeout(statuses, duration);
            };
            // If already loaded
            if (video.readyState >= 1) {
                duration = video.duration * 1000;
                startProgressAnimation(duration);
                setStatusTimeout(statuses, duration);
            }
            return; // Exit, will be handled by onloadedmetadata
        }
    }

    // For images/text, use 10 seconds
    startProgressAnimation(duration);
    setStatusTimeout(statuses, duration);
}

// Set status timeout for auto-advance
function setStatusTimeout(statuses, duration) {
    clearTimeout(statusState.statusTimer);
    statusState.statusTimer = setTimeout(() => {
        if (statusState.currentStatusIndex < statuses.length - 1) {
            statusState.currentStatusIndex++;
            refreshCurrentStatusView();
        } else {
            closeStatusViewer();
        }
    }, duration);
}

// Start progress bar animation
function startProgressAnimation(duration) {
    const activeBar = document.querySelector('.status-progress-bar.active');
    if (activeBar) {
        activeBar.style.setProperty('--progress-duration', `${duration}ms`);
        activeBar.classList.remove('animating');
        // Force reflow
        void activeBar.offsetWidth;
        activeBar.classList.add('animating');
    }
}

// Close status viewer
function closeStatusViewer() {
    clearTimeout(statusState.statusTimer);
    statusState.currentViewingUser = null;
    statusState.currentStatusIndex = 0;

    // Only show placeholder if we're still in status view
    if (archiveState?.currentView === 'status') {
        showStatusPlaceholder();
    }

    // Reload contact statuses to update viewed status
    loadContactStatuses().then(() => renderStatusList());
}

// Reset chat area when leaving status (called when navigating away from status)
function resetStatusView() {
    clearTimeout(statusState.statusTimer);
    statusState.currentViewingUser = null;
    statusState.currentStatusIndex = 0;

    // Only reset chat area if we have the necessary elements
    const chatArea = document.getElementById('chatArea');
    const activeChatEl = document.getElementById('activeChat');

    if (chatArea) {
        // Force clear the status placeholder and show default chat placeholder
        chatArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <svg class="w-24 h-24 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <p class="text-lg">Select a chat to start messaging</p>
            </div>
        `;

        // Only try to restore chat if chat elements exist
        if (AppState.currentChat && activeChatEl && typeof window.openChat === 'function') {
            setTimeout(() => window.openChat(AppState.currentChat, AppState.currentChatType || 'user'), 100);
        }
    }
}

// Show create status modal
function showCreateStatusModal() {
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'createStatusModal';
    modal.innerHTML = `
        <div class="pin-modal-content" style="max-width: 400px;">
            <h3 class="pin-modal-title">Create Status</h3>
            
            <div class="status-create-options">
                <button class="status-create-btn" onclick="createTextStatus()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span>Text</span>
                </button>
                <button class="status-create-btn" onclick="createPhotoStatus()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>Photo</span>
                </button>
                <button class="status-create-btn" onclick="createVideoStatus()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span>Video</span>
                </button>
            </div>
            
            <button class="btn-secondary w-full py-2 rounded-lg mt-4" onclick="closeCreateStatusModal()">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close create status modal
function closeCreateStatusModal() {
    document.getElementById('createStatusModal')?.remove();
    document.getElementById('textStatusModal')?.remove();
}

// Create text status
function createTextStatus() {
    closeCreateStatusModal();

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    let currentColor = colors[0];

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'textStatusModal';
    modal.innerHTML = `
        <div class="text-status-editor" style="background: ${currentColor}">
            <div class="text-status-header">
                <button onclick="closeCreateStatusModal()" class="text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="color-picker">
                    ${colors.map(c => `<button class="color-btn ${c === currentColor ? 'active' : ''}" style="background: ${c}" onclick="changeStatusColor('${c}')"></button>`).join('')}
                </div>
            </div>
            <textarea id="statusTextInput" placeholder="Type a status..." class="text-status-input" maxlength="500"></textarea>
            <button class="status-send-btn" onclick="submitTextStatus()">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('statusTextInput')?.focus();

    window.currentStatusColor = currentColor;
}

// Change status background color
function changeStatusColor(color) {
    window.currentStatusColor = color;
    const editor = document.querySelector('.text-status-editor');
    if (editor) editor.style.background = color;

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.style.background === color);
    });
}

// Submit text status
async function submitTextStatus() {
    const content = document.getElementById('statusTextInput')?.value?.trim();
    if (!content) {
        showToast('Please enter some text', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                background_color: window.currentStatusColor || '#6366f1'
            })
        });

        if (response.ok) {
            showToast('Status posted!', 'success');
            closeCreateStatusModal();
            loadStatusView(); // Refresh
        } else {
            showToast('Failed to post status', 'error');
        }
    } catch (error) {
        console.error('Error posting status:', error);
        showToast('Failed to post status', 'error');
    }
}

// Create photo status with editor
function createPhotoStatus() {
    closeCreateStatusModal();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Open the media editor
        openMediaEditor(file);
    };

    input.click();
}

// Create video status with editor
function createVideoStatus() {
    closeCreateStatusModal();

    // Show options modal for file or URL
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'videoOptionsModal';
    modal.innerHTML = `
        <div class="pin-modal-content" style="max-width: 400px;">
            <h3 class="pin-modal-title">Add Video Status</h3>
            
            <div class="status-create-options">
                <button class="status-create-btn" onclick="uploadVideoFile()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <span>Upload from Device</span>
                </button>
                <button class="status-create-btn" onclick="showVideoUrlInput()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                    <span>Paste Video URL</span>
                </button>
            </div>
            
            <button class="btn-secondary w-full py-2 rounded-lg mt-4" onclick="document.getElementById('videoOptionsModal')?.remove()">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Upload video file from device
function uploadVideoFile() {
    document.getElementById('videoOptionsModal')?.remove();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (limit to 30MB for videos)
        if (file.size > 30 * 1024 * 1024) {
            showToast('Video must be less than 30MB', 'error');
            return;
        }

        // Open the media editor
        openMediaEditor(file);
    };

    input.click();
}

// Show video URL input modal
function showVideoUrlInput() {
    document.getElementById('videoOptionsModal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'videoUrlModal';
    modal.innerHTML = `
        <div class="pin-modal-content" style="max-width: 450px;">
            <h3 class="pin-modal-title">Paste Video URL</h3>
            <p class="text-gray-400 text-sm mb-4">Enter a direct link to a video file (MP4, WebM, etc.)</p>
            <input type="url" id="videoUrlInput" placeholder="https://example.com/video.mp4" 
                   class="pin-input w-full" style="margin-bottom: 16px;">
            <div class="flex gap-3">
                <button class="btn-primary flex-1 py-2 rounded-lg" onclick="loadVideoFromUrl()">Load Video</button>
                <button class="btn-secondary flex-1 py-2 rounded-lg" onclick="document.getElementById('videoUrlModal')?.remove()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('videoUrlInput')?.focus();
}

// Load video from URL
async function loadVideoFromUrl() {
    const urlInput = document.getElementById('videoUrlInput');
    const url = urlInput?.value?.trim();

    if (!url) {
        showToast('Please enter a video URL', 'error');
        return;
    }

    document.getElementById('videoUrlModal')?.remove();
    showToast('Loading video...', 'info');

    try {
        // Fetch the video as blob
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load video');

        const blob = await response.blob();

        if (!blob.type.startsWith('video/')) {
            showToast('URL does not point to a valid video', 'error');
            return;
        }

        // Create file from blob
        const file = new File([blob], 'video_from_url.mp4', { type: blob.type || 'video/mp4' });

        // Open media editor
        openMediaEditor(file);
    } catch (error) {
        console.error('Failed to load video from URL:', error);
        showToast('Failed to load video. Make sure the URL is accessible.', 'error');
    }
}

// Media editor state
let editorState = {
    file: null,
    isVideo: false,
    canvas: null,
    ctx: null,
    isDrawing: false,
    currentTool: 'pencil',
    currentColor: '#ffffff',
    brushSize: 4,
    history: [],
    historyIndex: -1,
    overlays: [], // For draggable text/emoji
    lastX: 0,
    lastY: 0
};

// Open media editor with drawing tools
function openMediaEditor(file) {
    editorState.file = file;
    editorState.isVideo = file.type.startsWith('video');
    editorState.history = [];
    editorState.historyIndex = -1;
    editorState.overlays = [];
    editorState.currentTool = 'pencil';

    const modal = document.createElement('div');
    modal.className = 'media-editor-modal';
    modal.id = 'mediaEditorModal';

    const mediaUrl = URL.createObjectURL(file);

    modal.innerHTML = `
        <div class="media-editor">
            <!-- Top Toolbar -->
            <div class="editor-toolbar-top">
                <button class="editor-tool-btn" onclick="closeMediaEditor()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="editor-tools">
                    <button class="editor-tool-btn active" id="pencilTool" onclick="setEditorTool('pencil')" title="Draw">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" id="textTool" onclick="showTextInputModal()" title="Add Text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" id="stickerTool" onclick="showEmojiPicker()" title="Stickers">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="undoEdit()" title="Undo">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="deleteMedia()" title="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                <div class="editor-actions"></div>
            </div>
            
            <!-- Canvas/Media Container -->
            <div class="editor-canvas-container" id="editorCanvasContainer">
                ${editorState.isVideo
            ? `<video id="editorVideo" src="${mediaUrl}" class="editor-media" controls></video>`
            : `<img id="editorImage" src="${mediaUrl}" class="editor-media" style="display:none;">`
        }
                <canvas id="editorCanvas" class="editor-canvas"></canvas>
                <div id="overlaysContainer" class="overlays-container"></div>
            </div>
            
            <!-- Color Picker -->
            <div class="editor-color-picker" id="editorColorPicker">
                <div class="color-options">
                    ${['#ffffff', '#000000', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'].map(c =>
            `<button class="editor-color-btn ${editorState.currentColor === c ? 'active' : ''}" style="background: ${c}" onclick="setEditorColor('${c}')"></button>`
        ).join('')}
                </div>
                <input type="range" min="2" max="30" value="${editorState.brushSize}" class="brush-size-slider" oninput="setBrushSize(this.value)">
            </div>
            
            <!-- Bottom Bar -->
            <div class="editor-bottom-bar">
                <div class="editor-caption-container">
                    <input type="text" id="statusCaption" placeholder="Add a caption..." class="editor-caption-input">
                </div>
                <button class="editor-send-btn" onclick="submitMediaStatus()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Initialize canvas after modal is added
    setTimeout(() => initEditorCanvas(), 150);
}

// Initialize editor canvas with proper event handling
function initEditorCanvas() {
    const canvas = document.getElementById('editorCanvas');
    const container = document.getElementById('editorCanvasContainer');
    const image = document.getElementById('editorImage');

    if (!canvas || !container) return;

    editorState.canvas = canvas;
    editorState.ctx = canvas.getContext('2d');

    if (editorState.isVideo) {
        // For video, show video and use canvas for drawing overlay
        const video = document.getElementById('editorVideo');
        if (video) {
            video.onloadedmetadata = () => {
                const containerRect = container.getBoundingClientRect();
                const scale = Math.min(
                    (containerRect.width - 40) / video.videoWidth,
                    (containerRect.height - 40) / video.videoHeight
                );
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                canvas.style.width = canvas.width + 'px';
                canvas.style.height = canvas.height + 'px';
            };
        }
    } else {
        // For image, draw it on canvas
        if (image) {
            const loadImage = () => {
                const containerRect = container.getBoundingClientRect();
                const maxWidth = containerRect.width - 40;
                const maxHeight = containerRect.height - 100;

                let width = image.naturalWidth || image.width;
                let height = image.naturalHeight || image.height;

                if (width === 0 || height === 0) {
                    // Image not loaded yet, wait
                    setTimeout(loadImage, 100);
                    return;
                }

                // Scale to fit container
                const scale = Math.min(maxWidth / width, maxHeight / height, 1);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);

                canvas.width = width;
                canvas.height = height;
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';

                // Clear and draw image
                editorState.ctx.clearRect(0, 0, width, height);
                editorState.ctx.drawImage(image, 0, 0, width, height);
                saveHistory();
            };

            // Try to load immediately if already loaded, otherwise wait
            if (image.complete && image.naturalWidth > 0) {
                setTimeout(loadImage, 50);
            } else {
                image.onload = loadImage;
            }
        }
    }

    // Mouse events for drawing
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleMouseDown(e) {
    if (editorState.currentTool !== 'pencil') return;

    editorState.isDrawing = true;
    const pos = getCanvasPosition(e);
    editorState.lastX = pos.x;
    editorState.lastY = pos.y;

    // Start new path
    editorState.ctx.beginPath();
    editorState.ctx.moveTo(pos.x, pos.y);
    editorState.ctx.strokeStyle = editorState.currentColor;
    editorState.ctx.lineWidth = editorState.brushSize;
    editorState.ctx.lineCap = 'round';
    editorState.ctx.lineJoin = 'round';
}

function handleMouseMove(e) {
    if (!editorState.isDrawing || editorState.currentTool !== 'pencil') return;

    const pos = getCanvasPosition(e);

    // Draw smooth line
    editorState.ctx.lineTo(pos.x, pos.y);
    editorState.ctx.stroke();
    editorState.ctx.beginPath();
    editorState.ctx.moveTo(pos.x, pos.y);

    editorState.lastX = pos.x;
    editorState.lastY = pos.y;
}

function handleMouseUp() {
    if (editorState.isDrawing) {
        editorState.isDrawing = false;
        editorState.ctx.closePath();
        saveHistory();
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchEnd(e) {
    handleMouseUp();
}

function getCanvasPosition(e) {
    const canvas = editorState.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Drawing functions
function startDrawing(e) {
    if (editorState.currentTool !== 'pencil') return;

    editorState.isDrawing = true;
    const rect = editorState.canvas.getBoundingClientRect();
    const scaleX = editorState.canvas.width / rect.width;
    const scaleY = editorState.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    editorState.ctx.beginPath();
    editorState.ctx.moveTo(x, y);
    editorState.ctx.strokeStyle = editorState.currentColor;
    editorState.ctx.lineWidth = editorState.brushSize;
    editorState.ctx.lineCap = 'round';
    editorState.ctx.lineJoin = 'round';

    // Show color picker when drawing
    document.getElementById('editorColorPicker').style.display = 'flex';
}

function draw(e) {
    if (!editorState.isDrawing || editorState.currentTool !== 'pencil') return;

    const rect = editorState.canvas.getBoundingClientRect();
    const scaleX = editorState.canvas.width / rect.width;
    const scaleY = editorState.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    editorState.ctx.lineTo(x, y);
    editorState.ctx.stroke();
}

function stopDrawing() {
    if (editorState.isDrawing) {
        editorState.isDrawing = false;
        editorState.ctx.closePath();
        saveHistory();
    }
}

// Save canvas state to history
function saveHistory() {
    if (!editorState.canvas) return;
    const imageData = editorState.canvas.toDataURL();
    editorState.historyIndex++;
    editorState.history = editorState.history.slice(0, editorState.historyIndex);
    editorState.history.push(imageData);
}

// Undo last edit
function undoEdit() {
    if (editorState.historyIndex > 0) {
        editorState.historyIndex--;
        const img = new Image();
        img.onload = () => {
            editorState.ctx.clearRect(0, 0, editorState.canvas.width, editorState.canvas.height);
            editorState.ctx.drawImage(img, 0, 0);
        };
        img.src = editorState.history[editorState.historyIndex];
    } else {
        showToast('Nothing to undo', 'info');
    }
}

// Set editor tool
function setEditorTool(tool) {
    editorState.currentTool = tool;
    document.querySelectorAll('.editor-tool-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (tool === 'pencil') {
        document.getElementById('editorColorPicker').style.display = 'flex';
    } else {
        document.getElementById('editorColorPicker').style.display = 'none';
    }

    if (tool === 'text') {
        showTextInputModal();
    }
}

// Set editor color
function setEditorColor(color) {
    editorState.currentColor = color;
    document.querySelectorAll('.editor-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.style.background === color);
    });
}

// Set brush size
function setBrushSize(size) {
    editorState.brushSize = parseInt(size);
}

// Show text input modal with font options
function showTextInputModal() {
    const modal = document.createElement('div');
    modal.className = 'text-input-overlay';
    modal.id = 'textInputOverlay';
    modal.innerHTML = `
        <div class="text-input-modal">
            <div class="text-input-header">
                <h4>Add Text</h4>
                <button onclick="closeTextInputModal()">✕</button>
            </div>
            <textarea id="editorTextInput" placeholder="Enter your text..." class="editor-text-area"></textarea>
            <div class="text-options">
                <select id="fontFamily" class="font-select">
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Impact">Impact</option>
                </select>
                <select id="fontSize" class="font-select">
                    <option value="16">16px</option>
                    <option value="20">20px</option>
                    <option value="24" selected>24px</option>
                    <option value="32">32px</option>
                    <option value="48">48px</option>
                    <option value="64">64px</option>
                </select>
                <div class="text-color-picker">
                    ${['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(c =>
        `<button class="text-color-btn" style="background: ${c}" onclick="setTextColor('${c}')"></button>`
    ).join('')}
                </div>
            </div>
            <button class="btn-primary w-full py-2 rounded-lg" onclick="createTextOverlay()">Add Text</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('editorTextInput')?.focus();
    window.pendingTextColor = '#ffffff';
}

function closeTextInputModal() {
    document.getElementById('textInputOverlay')?.remove();
}

function setTextColor(color) {
    window.pendingTextColor = color;
    document.querySelectorAll('.text-color-btn').forEach(btn => {
        btn.style.borderColor = btn.style.background === color ? 'white' : 'transparent';
    });
}

// Create draggable text overlay
function createTextOverlay() {
    const text = document.getElementById('editorTextInput')?.value?.trim();
    if (!text) {
        showToast('Please enter some text', 'error');
        return;
    }

    const fontFamily = document.getElementById('fontFamily')?.value || 'Arial';
    const fontSize = document.getElementById('fontSize')?.value || '24';
    const color = window.pendingTextColor || '#ffffff';

    closeTextInputModal();

    const overlay = document.createElement('div');
    overlay.className = 'draggable-overlay text-overlay';
    overlay.innerHTML = text;
    overlay.style.cssText = `
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        color: ${color};
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    `;

    // Add to overlays container
    const container = document.getElementById('overlaysContainer');
    if (container) {
        container.appendChild(overlay);
        makeDraggable(overlay);
        editorState.overlays.push({ type: 'text', element: overlay, text, fontFamily, fontSize, color });
    }
}

// Add text to canvas (fallback)
function addTextToCanvas() {
    showTextInputModal();
}

// Backward compatibility
function enableTextPlacement() {
    createTextOverlay();
}

function placeText(e) {
    // No longer used - using overlays instead
}

// Show sticker/emoji picker dropdown
function showEmojiPicker() {
    // Remove existing picker if open
    document.getElementById('emojiPickerDropdown')?.remove();

    const stickers = [
        '😀', '😂', '🥰', '😎', '🤩', '😇', '🥳', '😍',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🔥', '✨', '⭐', '🌟', '💫', '🎉', '🎊', '🎁',
        '👍', '👏', '🙌', '💪', '🤝', '✌️', '👋', '🤟',
        '🌈', '☀️', '🌙', '⛅', '🌸', '🌺', '🌻', '🌹'
    ];

    const picker = document.createElement('div');
    picker.className = 'emoji-picker-dropdown';
    picker.id = 'emojiPickerDropdown';
    picker.innerHTML = `
        <div class="emoji-picker-header">
            <span>Pick an emoji</span>
            <button onclick="document.getElementById('emojiPickerDropdown')?.remove()">✕</button>
        </div>
        <div class="emoji-grid">
            ${stickers.map(s => `<button class="emoji-item" onclick="createEmojiOverlay('${s}')">${s}</button>`).join('')}
        </div>
    `;

    document.getElementById('editorCanvasContainer')?.appendChild(picker);
}

// Create draggable emoji overlay
function createEmojiOverlay(emoji) {
    document.getElementById('emojiPickerDropdown')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'draggable-overlay emoji-overlay';
    overlay.innerHTML = emoji;

    // Add to overlays container
    const container = document.getElementById('overlaysContainer');
    if (container) {
        container.appendChild(overlay);
        makeDraggable(overlay);
        editorState.overlays.push({ type: 'emoji', element: overlay, emoji });
    }
}

// Make element draggable
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        const rect = element.getBoundingClientRect();
        const parentRect = element.parentElement.getBoundingClientRect();
        initialX = rect.left - parentRect.left;
        initialY = rect.top - parentRect.top;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);

        element.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        element.style.left = (initialX + deltaX) + 'px';
        element.style.top = (initialY + deltaY) + 'px';
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
        element.style.cursor = 'grab';
    }
}

// Legacy function for backward compatibility
function addSticker() {
    showEmojiPicker();
}

function placeEmoji(emoji) {
    createEmojiOverlay(emoji);
}

function placeEmojiOnCanvas(e) {
    // No longer used - using overlays instead
}

// Crop image - show crop options
function cropImage() {
    if (editorState.isVideo) {
        showToast('Cannot crop videos', 'info');
        return;
    }

    // Remove existing crop modal if open
    document.getElementById('cropModal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'text-input-overlay';
    modal.id = 'cropModal';
    modal.innerHTML = `
        <div class="text-input-modal">
            <div class="text-input-header">
                <h4>Crop Image</h4>
                <button onclick="document.getElementById('cropModal')?.remove()">✕</button>
            </div>
            <div class="crop-options">
                <button class="crop-option-btn" onclick="applyCrop('square')">
                    <span style="font-size: 24px;">⬜</span>
                    <span>Square (1:1)</span>
                </button>
                <button class="crop-option-btn" onclick="applyCrop('portrait')">
                    <span style="font-size: 24px;">📱</span>
                    <span>Portrait (9:16)</span>
                </button>
                <button class="crop-option-btn" onclick="applyCrop('landscape')">
                    <span style="font-size: 24px;">🖼️</span>
                    <span>Landscape (16:9)</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Apply crop to canvas
function applyCrop(aspect) {
    document.getElementById('cropModal')?.remove();

    const canvas = editorState.canvas;
    const ctx = editorState.ctx;
    if (!canvas || !ctx) return;

    const currentWidth = canvas.width;
    const currentHeight = canvas.height;

    let newWidth, newHeight, startX, startY;

    if (aspect === 'square') {
        const size = Math.min(currentWidth, currentHeight);
        newWidth = newHeight = size;
        startX = (currentWidth - size) / 2;
        startY = (currentHeight - size) / 2;
    } else if (aspect === 'portrait') {
        // 9:16 ratio
        if (currentHeight / currentWidth > 16 / 9) {
            newWidth = currentWidth;
            newHeight = currentWidth * 16 / 9;
        } else {
            newHeight = currentHeight;
            newWidth = currentHeight * 9 / 16;
        }
        startX = (currentWidth - newWidth) / 2;
        startY = (currentHeight - newHeight) / 2;
    } else if (aspect === 'landscape') {
        // 16:9 ratio
        if (currentWidth / currentHeight > 16 / 9) {
            newHeight = currentHeight;
            newWidth = currentHeight * 16 / 9;
        } else {
            newWidth = currentWidth;
            newHeight = currentWidth * 9 / 16;
        }
        startX = (currentWidth - newWidth) / 2;
        startY = (currentHeight - newHeight) / 2;
    }

    // Get the cropped image data
    const imageData = ctx.getImageData(startX, startY, newWidth, newHeight);

    // Resize canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';

    // Put the cropped data
    ctx.putImageData(imageData, 0, 0);
    saveHistory();

    showToast(`Cropped to ${aspect}`, 'success');
}

// Delete media and close
function deleteMedia() {
    if (confirm('Delete this media?')) {
        closeMediaEditor();
    }
}

// Close media editor
function closeMediaEditor() {
    document.getElementById('mediaEditorModal')?.remove();
    document.getElementById('emojiPickerDropdown')?.remove();
    document.getElementById('textInputOverlay')?.remove();
    editorState = {
        file: null,
        isVideo: false,
        canvas: null,
        ctx: null,
        isDrawing: false,
        currentTool: 'pencil',
        currentColor: '#ffffff',
        brushSize: 4,
        history: [],
        historyIndex: -1,
        overlays: [],
        lastX: 0,
        lastY: 0
    };
}

// Render overlays onto canvas before submission
function renderOverlaysToCanvas() {
    const container = document.getElementById('overlaysContainer');
    const canvas = editorState.canvas;
    const ctx = editorState.ctx;

    if (!container || !canvas || !ctx) return;

    const canvasRect = canvas.getBoundingClientRect();

    editorState.overlays.forEach(overlay => {
        const el = overlay.element;
        const elRect = el.getBoundingClientRect();

        // Calculate position relative to canvas
        const x = (elRect.left - canvasRect.left) * (canvas.width / canvasRect.width);
        const y = (elRect.top - canvasRect.top + elRect.height * 0.8) * (canvas.height / canvasRect.height);

        if (overlay.type === 'text') {
            ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`;
            ctx.fillStyle = overlay.color;
            ctx.fillText(overlay.text, x, y);
        } else if (overlay.type === 'emoji') {
            ctx.font = '48px Arial';
            ctx.fillText(overlay.emoji, x, y);
        }
    });
}

// Submit media status
async function submitMediaStatus() {
    try {
        // Render overlays to canvas first
        renderOverlaysToCanvas();

        let fileToUpload = editorState.file;

        // If image was edited, get the canvas data
        if (!editorState.isVideo && editorState.canvas) {
            const blob = await new Promise(resolve => editorState.canvas.toBlob(resolve, 'image/jpeg', 0.9));
            fileToUpload = new File([blob], 'status.jpg', { type: 'image/jpeg' });
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', fileToUpload);

        const uploadResponse = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            },
            body: formData
        });

        if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            const caption = document.getElementById('statusCaption')?.value?.trim();

            // Create status with media
            const statusResponse = await fetch(`${API_URL}/api/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AppState.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: caption || null,
                    media_id: uploadData.file_id,
                    media_type: editorState.isVideo ? 'video' : 'image'
                })
            });

            if (statusResponse.ok) {
                showToast('Status posted!', 'success');
                closeMediaEditor();
                loadStatusView();
            } else {
                showToast('Failed to post status', 'error');
            }
        } else {
            showToast('Failed to upload media', 'error');
        }
    } catch (error) {
        console.error('Error uploading status:', error);
        showToast('Failed to post status', 'error');
    }
}

// Delete current status
async function deleteCurrentStatus(statusId) {
    if (!confirm('Delete this status?')) return;

    try {
        const response = await fetch(`${API_URL}/api/status/${statusId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            showToast('Status deleted', 'success');
            await loadMyStatuses();

            if (statusState.myStatuses.length === 0) {
                closeStatusViewer();
            } else {
                statusState.currentStatusIndex = Math.min(statusState.currentStatusIndex, statusState.myStatuses.length - 1);
                viewMyStatuses();
            }

            renderStatusList();
        }
    } catch (error) {
        showToast('Failed to delete status', 'error');
    }
}

// Show status views
async function showStatusViews(statusId) {
    try {
        const response = await fetch(`${API_URL}/api/status/${statusId}/views`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const viewers = await response.json();

            const modal = document.createElement('div');
            modal.className = 'pin-modal';
            modal.id = 'statusViewsModal';
            modal.innerHTML = `
                <div class="pin-modal-content">
                    <h3 class="pin-modal-title">Viewed by</h3>
                    <div class="status-viewers-list">
                        ${viewers.length === 0 ? '<p class="text-gray-500 text-center py-4">No views yet</p>' :
                    viewers.map(v => `
                                <div class="status-viewer-item">
                                    <div class="avatar-placeholder">${v.username.charAt(0).toUpperCase()}</div>
                                    <span>${v.username}</span>
                                </div>
                            `).join('')
                }
                    </div>
                    <button class="btn-primary w-full py-2 rounded-lg mt-4" onclick="this.closest('.pin-modal').remove()">Close</button>
                </div>
            `;

            document.body.appendChild(modal);
        }
    } catch (error) {
        showToast('Failed to load views', 'error');
    }
}

// Export functions
window.loadStatusView = loadStatusView;
window.handleMyStatusClick = handleMyStatusClick;
window.viewContactStatus = viewContactStatus;
window.closeStatusViewer = closeStatusViewer;
window.resetStatusView = resetStatusView;
window.showCreateStatusModal = showCreateStatusModal;
window.closeCreateStatusModal = closeCreateStatusModal;
window.createTextStatus = createTextStatus;
window.createPhotoStatus = createPhotoStatus;
window.changeStatusColor = changeStatusColor;
window.submitTextStatus = submitTextStatus;
window.handleStatusClick = handleStatusClick;
window.prevStatus = prevStatus;
window.nextStatus = nextStatus;
window.deleteCurrentStatus = deleteCurrentStatus;
window.showStatusViews = showStatusViews;
window.openMediaEditor = openMediaEditor;
window.closeMediaEditor = closeMediaEditor;
window.setEditorTool = setEditorTool;
window.setEditorColor = setEditorColor;
window.setBrushSize = setBrushSize;
window.addSticker = addSticker;
window.undoEdit = undoEdit;
window.cropImage = cropImage;
window.deleteMedia = deleteMedia;
window.submitMediaStatus = submitMediaStatus;
window.showTextInputModal = showTextInputModal;
window.closeTextInputModal = closeTextInputModal;
window.setTextColor = setTextColor;
window.enableTextPlacement = enableTextPlacement;
window.placeText = placeText;
window.placeEmoji = placeEmoji;
window.placeEmojiOnCanvas = placeEmojiOnCanvas;
window.showEmojiPicker = showEmojiPicker;
window.createTextOverlay = createTextOverlay;
window.createEmojiOverlay = createEmojiOverlay;
window.makeDraggable = makeDraggable;
window.renderOverlaysToCanvas = renderOverlaysToCanvas;
window.createVideoStatus = createVideoStatus;
window.applyCrop = applyCrop;
window.uploadVideoFile = uploadVideoFile;
window.showVideoUrlInput = showVideoUrlInput;
window.loadVideoFromUrl = loadVideoFromUrl;
window.showStatusOptionsDropdown = showStatusOptionsDropdown;

// Show status options dropdown (3-dot menu)
function showStatusOptionsDropdown(event) {
    event.stopPropagation();

    // Remove existing dropdown
    document.getElementById('statusOptionsDropdown')?.remove();

    const dropdown = document.createElement('div');
    dropdown.className = 'status-options-dropdown';
    dropdown.id = 'statusOptionsDropdown';
    dropdown.innerHTML = `
        <div class="dropdown-item" onclick="viewMyStatuses()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <span>View status</span>
        </div>
        <div class="dropdown-item" onclick="showCreateStatusModal()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Add new status</span>
        </div>
        <div class="dropdown-item" onclick="deleteAllMyStatuses()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>Delete all status</span>
        </div>
    `;

    // Position dropdown
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 5 + 'px';
    dropdown.style.left = rect.left - 120 + 'px';

    document.body.appendChild(dropdown);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeStatusDropdown, { once: true });
    }, 10);
}

function closeStatusDropdown() {
    document.getElementById('statusOptionsDropdown')?.remove();
}

function viewMyStatuses() {
    closeStatusDropdown();
    if (statusState.myStatuses.length > 0) {
        statusState.currentViewingUser = AppState.user?.id;
        statusState.currentStatusIndex = 0;
        displayStatuses(statusState.myStatuses, AppState.user?.username || 'Me', true);
    } else {
        showToast('No status to view', 'info');
    }
}

function deleteAllMyStatuses() {
    closeStatusDropdown();
    if (statusState.myStatuses.length === 0) {
        showToast('No status to delete', 'info');
        return;
    }
    if (confirm('Delete all your status updates?')) {
        // Delete all statuses
        statusState.myStatuses.forEach(async (status) => {
            try {
                await fetch(`${API_URL}/api/status/${status.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${AppState.token}` }
                });
            } catch (error) {
                console.error('Failed to delete status:', error);
            }
        });
        statusState.myStatuses = [];
        loadStatusView();
        showToast('All statuses deleted', 'success');
    }
}

window.viewMyStatuses = viewMyStatuses;
window.deleteAllMyStatuses = deleteAllMyStatuses;
window.closeStatusDropdown = closeStatusDropdown;

// Video control functions
function toggleStatusVideo() {
    const video = document.getElementById('statusVideo');
    if (!video) return;

    if (video.paused) {
        video.play();
        document.getElementById('playPauseIcon').innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
    } else {
        video.pause();
        document.getElementById('playPauseIcon').innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
    }
    // Pause auto-advance timer when manually controlling video
    clearTimeout(statusState.statusTimer);
}

function toggleStatusMute() {
    const video = document.getElementById('statusVideo');
    if (!video) return;

    video.muted = !video.muted;
    const muteLine = document.getElementById('muteLine');
    if (video.muted) {
        muteLine.style.display = 'block';
    } else {
        muteLine.style.display = 'none';
    }
}

function screenshotStatus() {
    const image = document.getElementById('statusImage');
    const video = document.getElementById('statusVideo');

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    if (image) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
    } else if (video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
    } else {
        showToast('Cannot screenshot text status', 'info');
        return;
    }

    // Download the image
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `status_screenshot_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Screenshot saved!', 'success');
    }, 'image/png');
}

// Reply functions
function toggleStatusEmojiPicker() {
    const picker = document.getElementById('statusEmojiPicker');
    if (picker) {
        picker.classList.toggle('hidden');
    }
}

function insertStatusEmoji(emoji) {
    const input = document.getElementById('statusReplyInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
    document.getElementById('statusEmojiPicker')?.classList.add('hidden');
}

async function sendStatusReply(userId, statusId) {
    const input = document.getElementById('statusReplyInput');
    const message = input?.value?.trim();

    if (!message) {
        showToast('Please type a message', 'info');
        return;
    }

    try {
        // Send as a regular message mentioning the status
        const msgData = {
            type: 'message',
            receiver_id: userId,
            content: `📱 Replied to your status: ${message}`,
            message_type: 'text'
        };

        if (typeof sendWsMessage === 'function') {
            sendWsMessage(msgData);
            showToast('Reply sent!', 'success');
            input.value = '';
        } else {
            showToast('Unable to send reply', 'error');
        }
    } catch (error) {
        console.error('Failed to send status reply:', error);
        showToast('Failed to send reply', 'error');
    }
}

// Export new functions
window.toggleStatusVideo = toggleStatusVideo;
window.toggleStatusMute = toggleStatusMute;
window.screenshotStatus = screenshotStatus;
window.toggleStatusEmojiPicker = toggleStatusEmojiPicker;
window.insertStatusEmoji = insertStatusEmoji;
window.sendStatusReply = sendStatusReply;
