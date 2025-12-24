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
        <div class="status-item my-status" onclick="handleMyStatusClick()">
            <div class="status-avatar ${hasMyStatus ? 'has-status' : ''}">
                <div class="avatar-placeholder">${(AppState.user?.username || 'U').charAt(0).toUpperCase()}</div>
                ${!hasMyStatus ? '<div class="status-add-btn">+</div>' : ''}
            </div>
            <div class="status-info">
                <div class="status-name">My status</div>
                <div class="status-time">${hasMyStatus ? 'Tap to view' : 'Tap to add status update'}</div>
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

    // Create progress bars
    const progressBars = statuses.map((_, i) => `
        <div class="status-progress-bar ${i < statusState.currentStatusIndex ? 'viewed' : ''} ${i === statusState.currentStatusIndex ? 'active' : ''}"></div>
    `).join('');

    // Status content
    let contentHTML;
    if (status.media_id) {
        if (status.media_type === 'video') {
            contentHTML = `<video src="${API_URL}/api/files/${status.media_id}" autoplay muted class="status-media"></video>`;
        } else {
            contentHTML = `<img src="${API_URL}/api/files/${status.media_id}" alt="Status" class="status-media">`;
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
                ${isOwn ? `
                    <button class="status-delete-btn" onclick="deleteCurrentStatus('${status.id}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                ` : ''}
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
            ` : ''}
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

    statusState.statusTimer = setTimeout(() => {
        if (statusState.currentStatusIndex < statuses.length - 1) {
            statusState.currentStatusIndex++;
            refreshCurrentStatusView();
        } else {
            closeStatusViewer();
        }
    }, 5000); // 5 seconds per status
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

    // Reset chat area to default empty state
    const chatArea = document.getElementById('chatArea');
    if (chatArea && !AppState.currentChat) {
        chatArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <svg class="w-24 h-24 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <p class="text-lg">Select a chat to start messaging</p>
            </div>
        `;
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

// Create photo/video status with editor
function createPhotoStatus() {
    closeCreateStatusModal();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Open the media editor
        openMediaEditor(file);
    };

    input.click();
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
    historyIndex: -1
};

// Open media editor with drawing tools
function openMediaEditor(file) {
    editorState.file = file;
    editorState.isVideo = file.type.startsWith('video');
    editorState.history = [];
    editorState.historyIndex = -1;

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
                    <button class="editor-tool-btn ${editorState.currentTool === 'pencil' ? 'active' : ''}" onclick="setEditorTool('pencil')" title="Draw">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn ${editorState.currentTool === 'text' ? 'active' : ''}" onclick="setEditorTool('text')" title="Add Text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="addSticker()" title="Stickers">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="undoEdit()" title="Undo">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="cropImage()" title="Crop">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                        </svg>
                    </button>
                    <button class="editor-tool-btn" onclick="deleteMedia()" title="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                <div class="editor-actions">
                    <span class="text-xs text-gray-400">...</span>
                </div>
            </div>
            
            <!-- Canvas/Media Container -->
            <div class="editor-canvas-container" id="editorCanvasContainer">
                ${editorState.isVideo
            ? `<video id="editorVideo" src="${mediaUrl}" class="editor-media" controls></video>`
            : `<img id="editorImage" src="${mediaUrl}" class="editor-media" style="display:none;">`
        }
                <canvas id="editorCanvas" class="editor-canvas"></canvas>
            </div>
            
            <!-- Color Picker -->
            <div class="editor-color-picker" id="editorColorPicker" style="display: none;">
                <div class="color-options">
                    ${['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(c =>
            `<button class="editor-color-btn ${editorState.currentColor === c ? 'active' : ''}" style="background: ${c}" onclick="setEditorColor('${c}')"></button>`
        ).join('')}
                </div>
                <input type="range" min="2" max="20" value="${editorState.brushSize}" class="brush-size-slider" onchange="setBrushSize(this.value)">
            </div>
            
            <!-- Bottom Bar -->
            <div class="editor-bottom-bar">
                <div class="editor-caption-container">
                    <button class="emoji-btn">😊</button>
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
    setTimeout(() => initEditorCanvas(), 100);
}

// Initialize editor canvas
function initEditorCanvas() {
    const canvas = document.getElementById('editorCanvas');
    const container = document.getElementById('editorCanvasContainer');
    const image = document.getElementById('editorImage');

    if (!canvas || !container) return;

    editorState.canvas = canvas;
    editorState.ctx = canvas.getContext('2d');

    if (editorState.isVideo) {
        // For video, just overlay the canvas
        const video = document.getElementById('editorVideo');
        if (video) {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth || 400;
                canvas.height = video.videoHeight || 300;
            };
        }
    } else {
        // For image, draw it on canvas
        if (image) {
            image.onload = () => {
                const maxWidth = container.clientWidth - 40;
                const maxHeight = container.clientHeight - 40;

                let width = image.naturalWidth;
                let height = image.naturalHeight;

                // Scale down if needed
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                editorState.ctx.drawImage(image, 0, 0, width, height);
                saveHistory();
            };
        }
    }

    // Setup canvas events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    });
    canvas.addEventListener('touchend', stopDrawing);
}

// Drawing functions
function startDrawing(e) {
    if (editorState.currentTool !== 'pencil') return;

    editorState.isDrawing = true;
    const rect = editorState.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    }
}

// Set editor tool
function setEditorTool(tool) {
    editorState.currentTool = tool;
    document.querySelectorAll('.editor-tool-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (tool === 'pencil') {
        document.getElementById('editorColorPicker').style.display = 'flex';
    } else {
        document.getElementById('editorColorPicker').style.display = 'none';
    }

    if (tool === 'text') {
        addTextToCanvas();
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

// Add text to canvas
function addTextToCanvas() {
    const text = prompt('Enter text:');
    if (!text) return;

    editorState.ctx.font = '24px Arial';
    editorState.ctx.fillStyle = editorState.currentColor;
    editorState.ctx.fillText(text, editorState.canvas.width / 2 - 50, editorState.canvas.height / 2);
    saveHistory();
}

// Add sticker
function addSticker() {
    const stickers = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '✨', '💯'];
    const sticker = stickers[Math.floor(Math.random() * stickers.length)];

    editorState.ctx.font = '48px Arial';
    editorState.ctx.fillText(sticker, Math.random() * (editorState.canvas.width - 50), Math.random() * (editorState.canvas.height - 50) + 50);
    saveHistory();
}

// Crop image (placeholder)
function cropImage() {
    showToast('Crop feature coming soon!', 'info');
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
        historyIndex: -1
    };
}

// Submit media status
async function submitMediaStatus() {
    try {
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
