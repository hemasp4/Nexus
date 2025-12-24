/**
 * NexusChat - WebSocket Handler
 * Handles real-time communication
 */

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Initialize WebSocket connection
function initWebSocket() {
    const token = AppState.token;
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/${token}`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket connected');
            AppState.isConnected = true;
            reconnectAttempts = 0;

            // Join all rooms
            AppState.rooms.forEach(room => {
                sendWsMessage({ type: 'join_room', room_id: room.id });
            });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWsMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        socket.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code);
            AppState.isConnected = false;

            // Attempt reconnection
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`Reconnecting... Attempt ${reconnectAttempts}`);
                setTimeout(initWebSocket, RECONNECT_DELAY);
            } else {
                showToast('Connection lost. Please refresh the page.', 'error');
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

    } catch (error) {
        console.error('Failed to create WebSocket:', error);
    }
}

// Send WebSocket message
function sendWsMessage(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.warn('WebSocket not connected');
    }
}

// Handle incoming WebSocket messages
function handleWsMessage(data) {
    switch (data.type) {
        case 'message':
            handleIncomingMessage(data);
            break;

        case 'typing':
            handleTypingIndicator(data);
            break;

        case 'read_receipt':
            handleReadReceipt(data);
            break;

        case 'user_status':
            handleUserStatus(data);
            break;

        case 'call_offer':
            handleCallOffer(data);
            break;

        case 'call_answer':
            handleCallAnswer(data);
            break;

        case 'ice_candidate':
            handleIceCandidate(data);
            break;

        case 'call_ended':
            handleCallEnded(data);
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

// Handle incoming message
function handleIncomingMessage(data) {
    // Store message
    const chatId = data.room_id || (data.sender_id === AppState.user.id ? data.receiver_id : data.sender_id);

    if (!AppState.messages[chatId]) {
        AppState.messages[chatId] = [];
    }

    // Check if message already exists
    if (!AppState.messages[chatId].find(m => m.id === data.id)) {
        AppState.messages[chatId].push(data);

        // If this is the current chat, render the message
        if (chatId === AppState.currentChat) {
            appendMessage(data);
            scrollToBottom();

            // Mark as read if from other user
            if (data.sender_id !== AppState.user.id) {
                markMessageAsRead(data.id);
            }
        } else {
            // Show notification
            if (data.sender_id !== AppState.user.id) {
                showToast(`New message from ${data.sender_username}`, 'info');
            }
        }
    }
}

// Handle typing indicator
function handleTypingIndicator(data) {
    const chatId = data.room_id || data.user_id;

    if (chatId === AppState.currentChat && data.user_id !== AppState.user.id) {
        const indicator = document.getElementById('typingIndicator');

        if (data.is_typing) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }
}

// Handle read receipt
function handleReadReceipt(data) {
    const chatId = AppState.currentChat;

    if (AppState.messages[chatId]) {
        const message = AppState.messages[chatId].find(m => m.id === data.message_id);
        if (message) {
            message.read_by = message.read_by || [];
            if (!message.read_by.includes(data.read_by)) {
                message.read_by.push(data.read_by);
            }

            // Update UI
            updateMessageStatus(data.message_id, 'read');
        }
    }
}

// Handle user status change
function handleUserStatus(data) {
    if (data.status === 'online') {
        AppState.onlineUsers.add(data.user_id);
    } else {
        AppState.onlineUsers.delete(data.user_id);
    }

    // Update UI
    const statusDot = document.querySelector(`[data-user-id="${data.user_id}"] .status-dot`);
    if (statusDot) {
        statusDot.className = `status-dot ${data.status === 'online' ? 'online' : 'offline'}`;
    }

    // Update chat header if this is current chat
    if (data.user_id === AppState.currentChat) {
        document.getElementById('chatStatus').textContent = data.status === 'online' ? 'Online' : 'Offline';
        document.getElementById('chatStatus').className = `status ${data.status === 'online' ? 'text-green-400' : 'text-gray-400'}`;
    }
}

// Send chat message via WebSocket
function sendChatMessage(content, options = {}) {
    const message = {
        type: 'message',
        content: content,
        message_type: options.messageType || 'text',
        file_id: options.fileId,
        file_name: options.fileName,
        file_size: options.fileSize,
        reply_to: options.replyTo,
    };

    if (AppState.currentChatType === 'room') {
        message.room_id = AppState.currentChat;
    } else {
        message.receiver_id = AppState.currentChat;
    }

    sendWsMessage(message);
}

// Send typing indicator
function sendTypingIndicator(isTyping) {
    const message = {
        type: 'typing',
        is_typing: isTyping
    };

    if (AppState.currentChatType === 'room') {
        message.room_id = AppState.currentChat;
    } else {
        message.receiver_id = AppState.currentChat;
    }

    sendWsMessage(message);
}

// Mark message as read
function markMessageAsRead(messageId) {
    sendWsMessage({
        type: 'read',
        message_id: messageId
    });
}

// Make functions globally accessible
window.initWebSocket = initWebSocket;
window.sendWsMessage = sendWsMessage;
window.sendChatMessage = sendChatMessage;
window.sendTypingIndicator = sendTypingIndicator;
window.markMessageAsRead = markMessageAsRead;
