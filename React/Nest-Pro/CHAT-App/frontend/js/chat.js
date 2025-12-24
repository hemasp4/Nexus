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

    // Attachment menu toggle
    document.getElementById('attachBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('attachmentMenu');
        menu?.classList.toggle('active');
    });

    // Close attachment menu on outside click
    document.addEventListener('click', () => {
        document.getElementById('attachmentMenu')?.classList.remove('active');
    });

    // Attachment option handlers
    document.querySelectorAll('.attachment-option').forEach(option => {
        option.addEventListener('click', () => handleAttachmentOption(option.dataset.type));
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
        const imgFileName = escapeHtml(msg.file_name || 'image.jpg');
        content = `
            <div class="message-image">
                <img src="${API_URL}/api/files/${msg.file_id}" alt="Image" class="cursor-pointer" onclick="openImagePreview('${msg.file_id}', '${imgFileName}')">
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
        const vidFileName = escapeHtml(msg.file_name || 'video.mp4');
        content = `
            <div class="message-video cursor-pointer" onclick="openVideoPreview('${msg.file_id}', '${vidFileName}')">
                <video class="max-w-full rounded-lg" muted>
                    <source src="${API_URL}/api/files/${msg.file_id}" type="video/mp4">
                </video>
                <div class="video-play-overlay">
                    <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
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
            <!-- Message Actions -->
            <div class="message-actions">
                <button class="message-action-btn" onclick="replyToMessage('${msg.id}')" title="Reply">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                    </svg>
                </button>
                <button class="message-action-btn" onclick="forwardMessage('${msg.id}')" title="Forward">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                </button>
                <button class="message-action-btn" onclick="copyMessageContent('${msg.id}')" title="Copy">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                </button>
                ${msg.file_id ? `
                <button class="message-action-btn" onclick="downloadFile('${msg.file_id}', '${escapeHtml(msg.file_name || 'file')}')" title="Download">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                </button>
                ` : ''}
                ${isSent ? `
                <button class="message-action-btn delete" onclick="deleteMessage('${msg.id}')" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
                ` : ''}
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

// Open image preview (lightbox)
function openImagePreview(fileId, fileName = 'image') {
    // Create lightbox overlay
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.id = 'imageLightbox';
    lightbox.innerHTML = `
        <div class="lightbox-backdrop" onclick="closeLightbox()"></div>
        <div class="lightbox-content">
            <div class="lightbox-header">
                <span class="lightbox-filename">${escapeHtml(fileName)}</span>
                <div class="lightbox-actions">
                    <button class="lightbox-btn" onclick="downloadFile('${fileId}', '${escapeHtml(fileName)}')" title="Download">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </button>
                    <button class="lightbox-btn" onclick="copyImageToClipboard('${fileId}')" title="Copy Image">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    <button class="lightbox-btn close" onclick="closeLightbox()" title="Close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="lightbox-image-container">
                <img src="${API_URL}/api/files/${fileId}" alt="Preview" class="lightbox-image" id="lightboxImage">
            </div>
        </div>
    `;

    document.body.appendChild(lightbox);

    // Add keyboard listener for ESC
    document.addEventListener('keydown', handleLightboxKeydown);

    // Fade in
    requestAnimationFrame(() => lightbox.classList.add('active'));
}

// Open video preview (lightbox)
function openVideoPreview(fileId, fileName = 'video') {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.id = 'imageLightbox';
    lightbox.innerHTML = `
        <div class="lightbox-backdrop" onclick="closeLightbox()"></div>
        <div class="lightbox-content video-lightbox">
            <div class="lightbox-header">
                <span class="lightbox-filename">${escapeHtml(fileName)}</span>
                <div class="lightbox-actions">
                    <button class="lightbox-btn" onclick="downloadFile('${fileId}', '${escapeHtml(fileName)}')" title="Download">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </button>
                    <button class="lightbox-btn close" onclick="closeLightbox()" title="Close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="lightbox-video-container">
                <video controls autoplay class="lightbox-video">
                    <source src="${API_URL}/api/files/${fileId}" type="video/mp4">
                </video>
            </div>
        </div>
    `;

    document.body.appendChild(lightbox);
    document.addEventListener('keydown', handleLightboxKeydown);
    requestAnimationFrame(() => lightbox.classList.add('active'));
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        setTimeout(() => lightbox.remove(), 200);
    }
    document.removeEventListener('keydown', handleLightboxKeydown);
}

// Handle keyboard in lightbox
function handleLightboxKeydown(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
}

// Copy image to clipboard
async function copyImageToClipboard(fileId) {
    try {
        const response = await fetch(`${API_URL}/api/files/${fileId}`);
        const blob = await response.blob();

        // For images, copy as image
        if (blob.type.startsWith('image/')) {
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            showToast('Image copied to clipboard', 'success');
        } else {
            showToast('Only images can be copied', 'info');
        }
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy image', 'error');
    }
}

// Handle attachment type selection
function handleAttachmentOption(type) {
    const fileInput = document.getElementById('fileInput');
    document.getElementById('attachmentMenu')?.classList.remove('active');

    switch (type) {
        case 'image':
            fileInput.accept = 'image/*,video/*';
            fileInput.click();
            break;
        case 'document':
            fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar';
            fileInput.click();
            break;
        case 'contact':
            showContactShareModal();
            break;
        default:
            fileInput.accept = '*/*';
            fileInput.click();
    }
}

// Show contact share modal
function showContactShareModal() {
    // For now, show a simple prompt
    if (AppState.contacts.length === 0) {
        showToast('No contacts to share', 'info');
        return;
    }

    const contactNames = AppState.contacts.map(c => c.username).join(', ');
    showToast(`Contact sharing coming soon! Available: ${contactNames}`, 'info');
}

// ==========================================
// Message Action Handlers
// ==========================================

// Reply state
let replyingTo = null;

// Reply to message
function replyToMessage(messageId) {
    const chatId = AppState.currentChat;
    const message = AppState.messages[chatId]?.find(m => m.id === messageId);

    if (!message) return;

    replyingTo = message;

    // Show reply preview above input
    const inputContainer = document.querySelector('.message-input-container');
    const existingPreview = document.querySelector('.reply-preview');
    if (existingPreview) existingPreview.remove();

    const preview = document.createElement('div');
    preview.className = 'reply-preview';
    preview.innerHTML = `
        <div class="reply-preview-content">
            <div class="reply-preview-name">${message.sender_username || 'You'}</div>
            <div class="reply-preview-text">${message.content || message.file_name || 'Media'}</div>
        </div>
        <button class="reply-preview-close" onclick="cancelReply()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    inputContainer.insertBefore(preview, inputContainer.firstChild);
    document.getElementById('messageInput').focus();
}

// Cancel reply
function cancelReply() {
    replyingTo = null;
    const preview = document.querySelector('.reply-preview');
    if (preview) preview.remove();
}

// Forward message
function forwardMessage(messageId) {
    const chatId = AppState.currentChat;
    const message = AppState.messages[chatId]?.find(m => m.id === messageId);

    if (!message) return;

    // Show contact selection modal
    if (AppState.contacts.length === 0) {
        showToast('No contacts to forward to', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'forwardModal';
    modal.innerHTML = `
        <div class="modal-content" style="width: 400px;">
            <div class="modal-header">
                <h3>Forward To</h3>
                <button class="btn-icon" onclick="closeForwardModal()">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body forward-modal-content">
                ${AppState.contacts.map(contact => `
                    <label class="forward-contact-item">
                        <input type="checkbox" value="${contact.id}" data-username="${contact.username}">
                        <div class="contact-avatar">
                            <div class="avatar-placeholder">${contact.username.charAt(0).toUpperCase()}</div>
                        </div>
                        <span>${contact.username}</span>
                    </label>
                `).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary px-4 py-2 rounded-lg" onclick="closeForwardModal()">Cancel</button>
                <button class="btn-primary px-4 py-2 rounded-lg" onclick="confirmForward('${messageId}')">Forward</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Confirm forward
function confirmForward(messageId) {
    const chatId = AppState.currentChat;
    const message = AppState.messages[chatId]?.find(m => m.id === messageId);

    const checkboxes = document.querySelectorAll('#forwardModal input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('Select at least one contact', 'error');
        return;
    }

    checkboxes.forEach(checkbox => {
        const receiverId = checkbox.value;

        // Send the message to each selected contact
        const forwardData = {
            type: 'message',
            content: message.content,
            message_type: message.message_type,
            file_id: message.file_id,
            file_name: message.file_name,
            file_size: message.file_size,
            receiver_id: receiverId
        };

        sendWsMessage(forwardData);
    });

    showToast(`Forwarded to ${checkboxes.length} contact(s)`, 'success');
    closeForwardModal();
}

// Close forward modal
function closeForwardModal() {
    const modal = document.getElementById('forwardModal');
    if (modal) modal.remove();
}

// Copy message content (text or file)
async function copyMessageContent(messageId) {
    const chatId = AppState.currentChat;
    const message = AppState.messages[chatId]?.find(m => m.id === messageId);

    if (!message) {
        showToast('Message not found', 'error');
        return;
    }

    // If it's a file/image message, copy the file
    if (message.file_id && (message.message_type === 'image' || message.message_type === 'video' || message.message_type === 'file')) {
        try {
            const response = await fetch(`${API_URL}/api/files/${message.file_id}`, {
                headers: {
                    'Authorization': `Bearer ${AppState.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch file');

            const blob = await response.blob();

            // For images, copy as image
            if (message.message_type === 'image' && blob.type.startsWith('image/')) {
                // Convert to PNG for clipboard compatibility (some browsers only support PNG)
                if (blob.type === 'image/png') {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                } else {
                    // Convert to PNG
                    const bitmap = await createImageBitmap(blob);
                    const canvas = document.createElement('canvas');
                    canvas.width = bitmap.width;
                    canvas.height = bitmap.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(bitmap, 0, 0);

                    canvas.toBlob(async (pngBlob) => {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': pngBlob })
                            ]);
                            showToast('Image copied to clipboard!', 'success');
                        } catch (err) {
                            console.error('Clipboard write failed:', err);
                            showToast('Failed to copy image', 'error');
                        }
                    }, 'image/png');
                    return;
                }
                showToast('Image copied to clipboard!', 'success');
            } else {
                // For non-image files, copy the download link
                const fileUrl = `${API_URL}/api/files/${message.file_id}`;
                await navigator.clipboard.writeText(fileUrl);
                showToast('File link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Copy failed:', err);
            // Fallback: copy the URL
            try {
                await navigator.clipboard.writeText(`${API_URL}/api/files/${message.file_id}`);
                showToast('File link copied!', 'success');
            } catch (e) {
                showToast('Failed to copy', 'error');
            }
        }
    } else if (message.content && message.content.trim()) {
        // For text messages, copy the text
        try {
            await navigator.clipboard.writeText(message.content);
            showToast('Text copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    } else {
        showToast('No content to copy', 'info');
    }
}

// Copy message text (legacy, kept for compatibility)
function copyMessage(messageId, content) {
    if (!content || content.trim() === '') {
        showToast('No text to copy', 'info');
        return;
    }

    navigator.clipboard.writeText(content)
        .then(() => showToast('Copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

// Download file
function downloadFile(fileId, fileName) {
    const link = document.createElement('a');
    link.href = `${API_URL}/api/files/${fileId}`;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download started', 'success');
}

// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Delete this message? This cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            // Remove from local state
            const chatId = AppState.currentChat;
            if (AppState.messages[chatId]) {
                const idx = AppState.messages[chatId].findIndex(m => m.id === messageId);
                if (idx !== -1) {
                    AppState.messages[chatId][idx].deleted = true;
                    // Re-render messages
                    renderMessages(AppState.messages[chatId]);
                }
            }
            showToast('Message deleted', 'success');
        } else {
            showToast('Failed to delete message', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete message', 'error');
    }
}

// Make functions globally accessible
window.openChat = openChat;
window.appendMessage = appendMessage;
window.scrollToBottom = scrollToBottom;
window.updateMessageStatus = updateMessageStatus;
window.openImagePreview = openImagePreview;
window.openVideoPreview = openVideoPreview;
window.closeLightbox = closeLightbox;
window.copyImageToClipboard = copyImageToClipboard;
window.handleAttachmentOption = handleAttachmentOption;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.forwardMessage = forwardMessage;
window.confirmForward = confirmForward;
window.closeForwardModal = closeForwardModal;
window.copyMessage = copyMessage;
window.copyMessageContent = copyMessageContent;
window.downloadFile = downloadFile;
window.deleteMessage = deleteMessage;
