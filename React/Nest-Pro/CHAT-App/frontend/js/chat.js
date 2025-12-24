/**
 * NexusChat - Chat Handler
 * Handles chat UI and message management
 */

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const emptyState = document.getElementById('emptyState');
const activeChat = document.getElementById('activeChat');

// Typing indicator debounce
let typingTimeout = null;
let isTyping = false;

// Initialize chat UI
document.addEventListener('DOMContentLoaded', () => {
    initChatUI();
});

function initChatUI() {
    // Message input handlers
    messageInput?.addEventListener('input', handleInput);
    messageInput?.addEventListener('keydown', handleKeyDown);
    sendBtn?.addEventListener('click', handleSend);

    // File attachment
    document.getElementById('attachBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);

    // Call buttons
    document.getElementById('voiceCallBtn')?.addEventListener('click', () => startCall('audio'));
    document.getElementById('videoCallBtn')?.addEventListener('click', () => startCall('video'));
}

// Open chat
async function openChat(id, type = 'user') {
    AppState.currentChat = id;
    AppState.currentChatType = type;

    // Update UI
    emptyState.classList.add('hidden');
    activeChat.classList.remove('hidden');
    activeChat.classList.add('flex');

    // Hide sidebar on mobile
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('hidden');
    }

    // Update chat header
    await updateChatHeader(id, type);

    // Load messages
    await loadMessages(id, type);

    // Mark contact as active
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
    });
    const selector = type === 'room' ? `[data-room-id="${id}"]` : `[data-user-id="${id}"]`;
    document.querySelector(selector)?.classList.add('active');

    // Focus input
    messageInput.focus();
}

// Update chat header
async function updateChatHeader(id, type) {
    const avatarEl = document.getElementById('chatAvatar');
    const nameEl = document.getElementById('chatName');
    const statusEl = document.getElementById('chatStatus');

    if (type === 'user') {
        const contact = AppState.contacts.find(c => c.id === id);
        if (contact) {
            avatarEl.textContent = contact.username.charAt(0).toUpperCase();
            nameEl.textContent = contact.username;
            const isOnline = AppState.onlineUsers.has(id);
            statusEl.textContent = isOnline ? 'Online' : 'Offline';
            statusEl.className = `status ${isOnline ? 'text-green-400' : 'text-gray-400'}`;
        }
    } else {
        const room = AppState.rooms.find(r => r.id === id);
        if (room) {
            avatarEl.textContent = '👥';
            nameEl.textContent = room.name;
            statusEl.textContent = `${room.members.length} members`;
            statusEl.className = 'status text-gray-400';
        }
    }
}

// Load messages
async function loadMessages(id, type) {
    messagesContainer.innerHTML = '<div class="flex justify-center py-8"><div class="loader-spinner"></div></div>';

    try {
        const endpoint = type === 'room'
            ? `${API_URL}/api/messages/room/${id}`
            : `${API_URL}/api/messages/conversation/${id}`;

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const messages = await response.json();
            AppState.messages[id] = messages;
            renderMessages(messages);
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        messagesContainer.innerHTML = '<div class="text-center text-gray-500 py-8">Failed to load messages</div>';
    }
}

// Render messages
function renderMessages(messages) {
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <p>No messages yet</p>
                <p class="text-sm mt-1">Send a message to start the conversation</p>
            </div>
        `;
        return;
    }

    messagesContainer.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    scrollToBottom();
}

// Create message HTML
function createMessageHTML(msg) {
    const isSent = msg.sender_id === AppState.user.id;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let content = '';

    if (msg.deleted) {
        content = '<span class="italic opacity-70">This message was deleted</span>';
    } else if (msg.message_type === 'image') {
        content = `
            <div class="message-image">
                <img src="${API_URL}/api/files/${msg.file_id}" alt="Image" class="cursor-pointer" onclick="openImagePreview('${msg.file_id}')">
            </div>
            ${msg.content ? `<div class="message-text">${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (msg.message_type === 'file') {
        content = `
            <div class="message-file">
                <div class="file-icon">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(msg.file_name || 'File')}</div>
                    <div class="file-size">${formatFileSize(msg.file_size)}</div>
                </div>
                <a href="${API_URL}/api/files/${msg.file_id}" download class="text-white hover:text-gray-200">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                </a>
            </div>
        `;
    } else if (msg.message_type === 'audio' || msg.message_type === 'voice') {
        content = `
            <audio controls class="max-w-full">
                <source src="${API_URL}/api/files/${msg.file_id}" type="audio/mpeg">
            </audio>
        `;
    } else if (msg.message_type === 'video') {
        content = `
            <video controls class="max-w-full rounded-lg">
                <source src="${API_URL}/api/files/${msg.file_id}" type="video/mp4">
            </video>
        `;
    } else {
        content = `<div class="message-text">${escapeHtml(msg.content)}</div>`;
    }

    // Message status icons
    let statusIcon = '';
    if (isSent) {
        if (msg.read_by && msg.read_by.length > 0) {
            statusIcon = `<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
            </svg>`;
        } else if (msg.delivered_to && msg.delivered_to.length > 0) {
            statusIcon = `<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
            </svg>`;
        } else {
            statusIcon = `<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>`;
        }
    }

    return `
        <div class="message ${isSent ? 'sent' : 'received'}" data-message-id="${msg.id}">
            ${!isSent && AppState.currentChatType === 'room' ? `
                <div class="message-avatar">
                    <div class="avatar-placeholder text-xs">${msg.sender_username?.charAt(0) || 'U'}</div>
                </div>
            ` : ''}
            <div class="message-content">
                ${!isSent && AppState.currentChatType === 'room' ? `
                    <div class="text-xs text-purple-400 mb-1 font-medium">${msg.sender_username}</div>
                ` : ''}
                ${content}
                <div class="message-meta">
                    <span class="message-time">${time}</span>
                    ${isSent ? `<span class="message-status">${statusIcon}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Append single message
function appendMessage(msg) {
    const html = createMessageHTML(msg);
    messagesContainer.insertAdjacentHTML('beforeend', html);
}

// Update message status
function updateMessageStatus(messageId, status) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        const statusEl = messageEl.querySelector('.message-status');
        if (statusEl && status === 'read') {
            statusEl.innerHTML = `<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
            </svg>`;
        }
    }
}

// Handle input
function handleInput() {
    const hasContent = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasContent;

    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    // Typing indicator
    if (hasContent && !isTyping) {
        isTyping = true;
        sendTypingIndicator(true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            isTyping = false;
            sendTypingIndicator(false);
        }
    }, 2000);
}

// Handle key down
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
}

// Handle send
function handleSend() {
    const content = messageInput.value.trim();
    if (!content) return;

    sendChatMessage(content);

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    if (isTyping) {
        isTyping = false;
        sendTypingIndicator(false);
    }
}

// Handle file select
async function handleFileSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
        await uploadAndSendFile(file);
    }

    e.target.value = '';
}

// Upload and send file
async function uploadAndSendFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        showToast('Uploading file...', 'info');

        const response = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();

            // Determine message type
            let messageType = 'file';
            if (file.type.startsWith('image/')) {
                messageType = 'image';
            } else if (file.type.startsWith('video/')) {
                messageType = 'video';
            } else if (file.type.startsWith('audio/')) {
                messageType = 'audio';
            }

            sendChatMessage(file.name, {
                messageType,
                fileId: data.file_id,
                fileName: data.filename,
                fileSize: data.size
            });

            showToast('File sent!', 'success');
        } else {
            showToast('Failed to upload file', 'error');
        }
    } catch (error) {
        console.error('File upload error:', error);
        showToast('Failed to upload file', 'error');
    }
}

// Scroll to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Open image preview
function openImagePreview(fileId) {
    // Could implement a lightbox here
    window.open(`${API_URL}/api/files/${fileId}`, '_blank');
}

// Make functions globally accessible
window.openChat = openChat;
window.appendMessage = appendMessage;
window.scrollToBottom = scrollToBottom;
window.updateMessageStatus = updateMessageStatus;
window.openImagePreview = openImagePreview;
