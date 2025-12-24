/**
 * NexusChat - Archive Handler
 * Handles archived chats with PIN protection
 */

// Archive State
let archiveState = {
    archivedChats: [],
    hasPin: false,
    isUnlocked: false,
    currentView: 'chats' // chats, archived, calls, groups
};

// Make it accessible globally
window.archiveState = archiveState;

// Initialize archive functionality
document.addEventListener('DOMContentLoaded', initArchive);

async function initArchive() {
    // Load archived chats count
    await loadArchivedInfo();

    // Setup navigation rail listeners
    setupNavRailListeners();

    // Setup dropdown menu
    setupDropdownMenu();

    // Setup Arise AI button
    setupAriseButton();

    // Restore saved navigation state
    restoreNavigationState();
}

// Load archived info from server
async function loadArchivedInfo() {
    try {
        const response = await fetch(`${API_URL}/api/archive`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            archiveState.archivedChats = data.archived_chats || [];
            archiveState.hasPin = data.has_pin;

            // Update UI
            updateArchivedBadge();
            updateArchivedBanner();
        }
    } catch (error) {
        console.error('Failed to load archived info:', error);
    }
}

// Setup navigation rail click listeners
function setupNavRailListeners() {
    const navBtns = document.querySelectorAll('.nav-rail-btn[data-nav]');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const navType = btn.dataset.nav;
            handleNavClick(navType, btn);
        });
    });

    // Settings button
    document.getElementById('navSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('settingsModal')?.classList.add('active');
    });
}

// Handle navigation click
function handleNavClick(navType, btn) {
    // Update active state
    document.querySelectorAll('.nav-rail-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update sidebar title
    const titles = {
        chats: 'Chats',
        calls: 'Calls',
        status: 'Status',
        groups: 'Groups',
        starred: 'Starred',
        archived: 'Archived',
        settings: 'Settings',
        profile: 'Profile'
    };

    document.getElementById('sidebarTitle').textContent = titles[navType] || 'Chats';

    // Reset status view if we were viewing status and switching to something else
    const wasInStatus = archiveState.currentView === 'status';
    if (wasInStatus && navType !== 'status' && typeof resetStatusView === 'function') {
        resetStatusView();
    }

    // Handle specific navigation
    switch (navType) {
        case 'archived':
            saveNavigationState('archived');
            openArchivedChats();
            break;
        case 'chats':
            archiveState.currentView = 'chats';
            archiveState.isUnlocked = false;
            saveNavigationState('chats');
            loadContacts(); // Reload normal contacts
            break;
        case 'calls':
            archiveState.currentView = 'calls';
            saveNavigationState('calls');
            if (typeof loadCallHistory === 'function') {
                loadCallHistory();
            }
            break;
        case 'groups':
            archiveState.currentView = 'groups';
            saveNavigationState('groups');
            loadRooms(); // Load groups
            break;
        case 'status':
            archiveState.currentView = 'status';
            saveNavigationState('status');
            if (typeof loadStatusView === 'function') {
                loadStatusView();
            }
            break;
        case 'settings':
            document.getElementById('settingsModal')?.classList.add('active');
            break;
        case 'profile':
            document.getElementById('settingsModal')?.classList.add('active');
            // Switch to account section
            document.querySelector('[data-settings-section="account"]')?.click();
            break;
        default:
            saveNavigationState(navType);
            showToast(`${titles[navType]} coming soon!`, 'info');
    }
}

// Open archived chats with PIN protection
async function openArchivedChats() {
    if (archiveState.archivedChats.length === 0) {
        showToast('No archived chats', 'info');
        return;
    }

    // Check if user has PIN set
    if (!archiveState.hasPin) {
        // Show PIN setup modal
        showPinSetupModal();
        return;
    }

    // If already unlocked in this session, show archived
    if (archiveState.isUnlocked) {
        showArchivedChats();
        return;
    }

    // Show PIN entry modal
    showPinEntryModal();
}

// Show PIN setup modal
function showPinSetupModal() {
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'pinModal';
    modal.innerHTML = `
        <div class="pin-modal-content">
            <h3 class="pin-modal-title">Set Archive PIN</h3>
            <p class="pin-modal-subtitle">Create a 4-digit PIN to protect your archived chats</p>
            
            <div class="pin-input-container" id="pinInputs">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
            </div>
            
            <div id="pinError" class="pin-error-text hidden"></div>
            
            <div class="flex gap-3 justify-center">
                <button class="btn-secondary px-6 py-2 rounded-lg" onclick="closePinModal()">Cancel</button>
                <button class="btn-primary px-6 py-2 rounded-lg" onclick="submitPinSetup()">Set PIN</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupPinInputs();
}

// Show PIN entry modal
function showPinEntryModal() {
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'pinModal';
    modal.innerHTML = `
        <div class="pin-modal-content">
            <h3 class="pin-modal-title">Enter PIN</h3>
            <p class="pin-modal-subtitle">Enter your 4-digit PIN to access archived chats</p>
            
            <div class="pin-input-container" id="pinInputs">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]">
            </div>
            
            <div id="pinError" class="pin-error-text hidden"></div>
            
            <p class="pin-forgot-link" onclick="showForgotPinModal()">Forgot PIN?</p>
            
            <div class="flex gap-3 justify-center mt-4">
                <button class="btn-secondary px-6 py-2 rounded-lg" onclick="closePinModal()">Cancel</button>
                <button class="btn-primary px-6 py-2 rounded-lg" onclick="submitPinVerify()">Unlock</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupPinInputs();
}

// Show forgot PIN modal
function showForgotPinModal() {
    closePinModal();

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'pinModal';
    modal.innerHTML = `
        <div class="pin-modal-content">
            <h3 class="pin-modal-title">Reset PIN</h3>
            <p class="pin-modal-subtitle">We'll send an OTP to your registered email</p>
            
            <input type="email" id="forgotPinEmail" class="input-field w-full mb-4 px-4 py-3 rounded-lg" 
                   placeholder="Enter your email" value="${AppState.user?.email || ''}">
            
            <div id="pinError" class="pin-error-text hidden"></div>
            
            <div class="flex gap-3 justify-center">
                <button class="btn-secondary px-6 py-2 rounded-lg" onclick="closePinModal()">Cancel</button>
                <button class="btn-primary px-6 py-2 rounded-lg" onclick="requestPinOTP()">Send OTP</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Show OTP verification modal
function showOTPModal() {
    closePinModal();

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'pinModal';
    modal.innerHTML = `
        <div class="pin-modal-content">
            <h3 class="pin-modal-title">Enter OTP</h3>
            <p class="pin-modal-subtitle">Enter the 6-digit OTP sent to your email</p>
            
            <div class="otp-input-container" id="otpInputs">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
            </div>
            
            <p class="pin-modal-subtitle mt-4">Enter new 4-digit PIN</p>
            
            <div class="pin-input-container" id="newPinInputs">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric">
                <input type="password" class="pin-input" maxlength="1" inputmode="numeric">
            </div>
            
            <div id="pinError" class="pin-error-text hidden"></div>
            
            <div class="flex gap-3 justify-center mt-4">
                <button class="btn-secondary px-6 py-2 rounded-lg" onclick="closePinModal()">Cancel</button>
                <button class="btn-primary px-6 py-2 rounded-lg" onclick="submitPinReset()">Reset PIN</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupPinInputs();
    setupOTPInputs();
}

// Setup PIN input auto-focus
function setupPinInputs() {
    const inputs = document.querySelectorAll('.pin-input');

    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                inputs[idx - 1].focus();
            }
        });

        // Only allow numbers
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });

    // Focus first input
    if (inputs[0]) inputs[0].focus();
}

// Setup OTP input auto-focus
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input');

    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                inputs[idx - 1].focus();
            }
        });
    });

    if (inputs[0]) inputs[0].focus();
}

// Get PIN from inputs
function getPinValue(containerId = 'pinInputs') {
    const container = document.getElementById(containerId);
    if (!container) return '';

    const inputs = container.querySelectorAll('.pin-input');
    return Array.from(inputs).map(i => i.value).join('');
}

// Get OTP from inputs
function getOTPValue() {
    const inputs = document.querySelectorAll('.otp-input');
    return Array.from(inputs).map(i => i.value).join('');
}

// Submit PIN setup
async function submitPinSetup() {
    const pin = getPinValue();

    if (pin.length !== 4) {
        showPinError('Please enter a 4-digit PIN');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/archive/pin`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin })
        });

        if (response.ok) {
            archiveState.hasPin = true;
            archiveState.isUnlocked = true;
            closePinModal();
            showToast('PIN set successfully!', 'success');
            showArchivedChats();
        } else {
            const error = await response.json();
            showPinError(error.detail || 'Failed to set PIN');
        }
    } catch (error) {
        showPinError('Failed to set PIN');
    }
}

// Submit PIN verification
async function submitPinVerify() {
    const pin = getPinValue();

    if (pin.length !== 4) {
        showPinError('Please enter a 4-digit PIN');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/archive/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin })
        });

        if (response.ok) {
            archiveState.isUnlocked = true;
            closePinModal();
            showArchivedChats();
        } else {
            showPinError('Incorrect PIN');
            shakePinInputs();
        }
    } catch (error) {
        showPinError('Verification failed');
    }
}

// Request PIN reset OTP
async function requestPinOTP() {
    const email = document.getElementById('forgotPinEmail')?.value;

    if (!email) {
        showPinError('Please enter your email');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/archive/forgot-pin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            const data = await response.json();
            showToast('OTP sent to your email!', 'success');
            showOTPModal();

            // For testing, show OTP in console
            if (data.debug_otp) {
                console.log('DEBUG OTP:', data.debug_otp);
                showToast(`Test OTP: ${data.debug_otp}`, 'info');
            }
        } else {
            const error = await response.json();
            showPinError(error.detail || 'Failed to send OTP');
        }
    } catch (error) {
        showPinError('Failed to send OTP');
    }
}

// Submit PIN reset
async function submitPinReset() {
    const otp = getOTPValue();
    const newPin = getPinValue('newPinInputs');

    if (otp.length !== 6) {
        showPinError('Please enter the 6-digit OTP');
        return;
    }

    if (newPin.length !== 4) {
        showPinError('Please enter a 4-digit PIN');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/archive/reset-pin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp, new_pin: newPin })
        });

        if (response.ok) {
            archiveState.hasPin = true;
            archiveState.isUnlocked = true;
            closePinModal();
            showToast('PIN reset successfully!', 'success');
            showArchivedChats();
        } else {
            const error = await response.json();
            showPinError(error.detail || 'Failed to reset PIN');
        }
    } catch (error) {
        showPinError('Failed to reset PIN');
    }
}

// Show PIN error
function showPinError(message) {
    const errorEl = document.getElementById('pinError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

// Shake PIN inputs on error
function shakePinInputs() {
    const inputs = document.querySelectorAll('.pin-input');
    inputs.forEach(input => {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
    });
}

// Close PIN modal
function closePinModal() {
    const modal = document.getElementById('pinModal');
    if (modal) modal.remove();
}

// Show archived chats
function showArchivedChats() {
    archiveState.currentView = 'archived';
    document.getElementById('sidebarTitle').textContent = 'Archived';

    // Filter and show only archived contacts
    const contactList = document.getElementById('contactList');
    if (!contactList) return;

    // Get archived contacts
    const archivedContacts = AppState.contacts.filter(c =>
        archiveState.archivedChats.includes(c.id)
    );

    if (archivedContacts.length === 0) {
        contactList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                </svg>
                <p>No archived chats</p>
            </div>
        `;
        return;
    }

    // Render archived contacts
    contactList.innerHTML = archivedContacts.map(contact => {
        return `
            <div class="contact-item" data-user-id="${contact.id}" 
                 onclick="openChat('${contact.id}', 'direct')"
                 oncontextmenu="showArchiveContextMenu(event, '${contact.id}', true)">
                <div class="contact-avatar">
                    <div class="avatar-placeholder">${contact.username.charAt(0).toUpperCase()}</div>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.username}</div>
                    <div class="contact-status">${contact.about || ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Archive a chat
async function archiveChat(chatId) {
    try {
        const response = await fetch(`${API_URL}/api/archive/chat/${chatId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            archiveState.archivedChats.push(chatId);
            updateArchivedBadge();
            updateArchivedBanner();
            showToast('Chat archived', 'success');

            // Reload contacts to hide archived one
            if (archiveState.currentView === 'chats') {
                loadContacts();
            }
        }
    } catch (error) {
        showToast('Failed to archive chat', 'error');
    }
}

// Unarchive a chat
async function unarchiveChat(chatId) {
    try {
        const response = await fetch(`${API_URL}/api/archive/chat/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            archiveState.archivedChats = archiveState.archivedChats.filter(id => id !== chatId);
            updateArchivedBadge();
            updateArchivedBanner();
            showToast('Chat unarchived', 'success');

            // Reload view
            if (archiveState.currentView === 'archived') {
                showArchivedChats();
            }
        }
    } catch (error) {
        showToast('Failed to unarchive chat', 'error');
    }
}

// Update archived badge count
function updateArchivedBadge() {
    const badge = document.getElementById('archivedBadge');
    if (badge) {
        const count = archiveState.archivedChats.length;
        badge.textContent = count > 0 ? count : '';
    }
}

// Update archived banner in sidebar
function updateArchivedBanner() {
    const banner = document.getElementById('archivedBanner');
    const count = document.getElementById('archivedCount');

    if (banner && count) {
        const archivedCount = archiveState.archivedChats.length;
        count.textContent = archivedCount;

        if (archivedCount > 0) {
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }
}

// Show context menu for archive/unarchive
function showArchiveContextMenu(event, chatId, isArchived = false) {
    event.preventDefault();

    // Remove existing context menu
    document.querySelector('.archive-context-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'archive-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 8px;
        z-index: 1000;
        box-shadow: var(--shadow-lg);
    `;

    menu.innerHTML = `
        <button class="context-menu-btn" onclick="event.stopPropagation(); ${isArchived ? `unarchiveChat('${chatId}')` : `archiveChat('${chatId}')`}; this.parentElement.remove();">
            ${isArchived ? '📤 Unarchive' : '📥 Archive'}
        </button>
    `;

    document.body.appendChild(menu);

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
}

// Setup dropdown menu
function setupDropdownMenu() {
    const menuBtn = document.getElementById('newChatMenuBtn');
    const dropdown = document.getElementById('newChatDropdown');

    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== menuBtn) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

// Setup Arise AI button - Toggle mode
let ariseOpen = false;

function setupAriseButton() {
    const ariseBtn = document.getElementById('ariseAiBtn');
    if (ariseBtn) {
        ariseBtn.addEventListener('click', () => {
            if (ariseOpen) {
                // Close Arise - go back to chats
                ariseOpen = false;
                ariseBtn.classList.remove('active');
                archiveState.currentView = 'chats';
                saveNavigationState('chats');
                document.getElementById('sidebarTitle').textContent = 'Chats';
                loadContacts();

                // Show normal chat area
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
            } else {
                // Open Arise
                ariseOpen = true;
                ariseBtn.classList.add('active');
                openAriseChat();
            }
        });
    }
}

// Open Arise chat in main area
function openAriseChat() {
    archiveState.currentView = 'arise';
    saveNavigationState('arise');
    document.getElementById('sidebarTitle').textContent = 'Arise AI';

    // Keep contacts visible but show Arise chat in main area
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
        chatArea.innerHTML = `
            <div class="arise-chat-container">
                <!-- Header -->
                <header class="chat-header">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-semibold text-white">Arise AI</h3>
                            <p class="text-xs text-green-400">Online</p>
                        </div>
                    </div>
                </header>
                
                <!-- Messages -->
                <div class="messages-container" id="ariseMessages">
                    <div class="flex justify-center py-4">
                        <div class="message received max-w-md">
                            <div class="message-content">
                                <p>👋 Hello! I'm Arise, your AI assistant. How can I help you today?</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Input -->
                <footer class="message-input-container">
                    <div class="message-input-wrapper">
                        <input type="text" id="ariseInput" class="message-input" placeholder="Ask Arise anything...">
                        <button class="btn-primary px-4 py-2 rounded-lg ml-2" onclick="sendAriseMessage()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                </footer>
            </div>
        `;

        // Setup enter key for Arise input
        document.getElementById('ariseInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAriseMessage();
        });
    }
}

// Send message to Arise AI
async function sendAriseMessage() {
    const input = document.getElementById('ariseInput');
    const message = input?.value?.trim();
    if (!message) return;

    input.value = '';

    const messagesContainer = document.getElementById('ariseMessages');
    if (!messagesContainer) return;

    // Add user message
    messagesContainer.innerHTML += `
        <div class="flex justify-end py-2 px-4">
            <div class="message sent max-w-md">
                <div class="message-content">
                    <p>${message}</p>
                </div>
            </div>
        </div>
    `;

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    messagesContainer.innerHTML += `
        <div class="flex justify-start py-2 px-4" id="ariseTyping">
            <div class="message received">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Send to AI API
    try {
        const response = await fetch(`${API_URL}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        // Remove typing indicator
        document.getElementById('ariseTyping')?.remove();

        if (response.ok) {
            const data = await response.json();
            messagesContainer.innerHTML += `
                <div class="flex justify-start py-2 px-4">
                    <div class="message received max-w-md">
                        <div class="message-content">
                            <p>${data.response || 'I apologize, I could not process that request.'}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            messagesContainer.innerHTML += `
                <div class="flex justify-start py-2 px-4">
                    <div class="message received max-w-md">
                        <div class="message-content">
                            <p>Sorry, I encountered an error. Please try again.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        document.getElementById('ariseTyping')?.remove();
        messagesContainer.innerHTML += `
            <div class="flex justify-start py-2 px-4">
                <div class="message received max-w-md">
                    <div class="message-content">
                        <p>Connection error. Please check your internet.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Save navigation state to localStorage
function saveNavigationState(navType) {
    try {
        localStorage.setItem('nexuschat_nav_state', navType);
    } catch (e) {
        console.warn('Could not save navigation state:', e);
    }
}

// Restore navigation state from localStorage
function restoreNavigationState() {
    try {
        const savedNav = localStorage.getItem('nexuschat_nav_state');
        if (savedNav) {
            // Find and click the corresponding nav button
            const navBtn = document.querySelector(`.nav-rail-btn[data-nav="${savedNav}"]`);
            if (navBtn) {
                // Small delay to ensure everything is loaded
                setTimeout(() => {
                    navBtn.click();
                }, 500);
            }
        }
    } catch (e) {
        console.warn('Could not restore navigation state:', e);
    }
}

// Show new group modal
let selectedGroupMembers = [];

function showNewGroupModal() {
    document.getElementById('newChatDropdown')?.classList.add('hidden');
    selectedGroupMembers = [];

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'newGroupModal';
    modal.innerHTML = `
        <div class="new-group-modal">
            <!-- Header -->
            <div class="new-group-header">
                <button class="text-white" onclick="closeNewGroupModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
                <div>
                    <h3 class="text-lg font-semibold text-white">New group</h3>
                    <p class="text-sm text-gray-400" id="memberCount">0/1025</p>
                </div>
            </div>
            
            <!-- Selected Members -->
            <div class="selected-members-container" id="selectedMembersContainer">
                <div class="selected-members" id="selectedMembers"></div>
                <input type="text" id="groupSearchInput" placeholder="Search contacts..." class="group-search-input">
            </div>
            
            <!-- Action Buttons -->
            <div class="group-action-buttons">
                <button class="btn-primary flex-1 py-3 rounded-lg" id="nextGroupBtn" onclick="showGroupNameStep()" disabled>Next</button>
                <button class="btn-secondary flex-1 py-3 rounded-lg" onclick="closeNewGroupModal()">Cancel</button>
            </div>
            
            <!-- Contacts List -->
            <div class="group-section-title">All contacts</div>
            <div class="group-contacts-list" id="groupContactsList">
                ${renderGroupContacts()}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup search
    document.getElementById('groupSearchInput')?.addEventListener('input', (e) => {
        filterGroupContacts(e.target.value);
    });
}

// Render contacts for group selection
function renderGroupContacts() {
    if (!AppState.contacts || AppState.contacts.length === 0) {
        return '<p class="text-gray-500 text-center py-4">No contacts available</p>';
    }

    return AppState.contacts.map(contact => `
        <div class="group-contact-item" onclick="toggleGroupMember('${contact.id}', '${contact.username}')">
            <div class="contact-avatar">
                ${contact.avatar
            ? `<img src="${API_URL}/api/files/${contact.avatar}" alt="${contact.username}">`
            : `<div class="avatar-placeholder">${contact.username.charAt(0).toUpperCase()}</div>`
        }
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username}</div>
                <div class="contact-status text-sm text-gray-400">${contact.about || 'Hey there!'}</div>
            </div>
            <div class="group-checkbox ${selectedGroupMembers.includes(contact.id) ? 'checked' : ''}" id="checkbox-${contact.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
        </div>
    `).join('');
}

// Toggle group member selection
function toggleGroupMember(contactId, username) {
    const index = selectedGroupMembers.findIndex(m => m.id === contactId);

    if (index === -1) {
        selectedGroupMembers.push({ id: contactId, username });
    } else {
        selectedGroupMembers.splice(index, 1);
    }

    updateSelectedMembersUI();
}

// Update UI for selected members
function updateSelectedMembersUI() {
    const container = document.getElementById('selectedMembers');
    const countEl = document.getElementById('memberCount');
    const nextBtn = document.getElementById('nextGroupBtn');

    if (container) {
        container.innerHTML = selectedGroupMembers.map(m => `
            <div class="selected-member-chip" onclick="toggleGroupMember('${m.id}', '${m.username}')">
                <span>${m.username}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </div>
        `).join('');
    }

    if (countEl) {
        countEl.textContent = `${selectedGroupMembers.length}/1025`;
    }

    if (nextBtn) {
        nextBtn.disabled = selectedGroupMembers.length === 0;
    }

    // Update checkboxes
    document.querySelectorAll('.group-checkbox').forEach(cb => {
        const id = cb.id.replace('checkbox-', '');
        cb.classList.toggle('checked', selectedGroupMembers.some(m => m.id === id));
    });
}

// Filter contacts by search
function filterGroupContacts(query) {
    const items = document.querySelectorAll('.group-contact-item');
    const q = query.toLowerCase();

    items.forEach(item => {
        const name = item.querySelector('.contact-name')?.textContent?.toLowerCase() || '';
        item.style.display = name.includes(q) ? 'flex' : 'none';
    });
}

// Show group name step
function showGroupNameStep() {
    const modal = document.getElementById('newGroupModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="new-group-modal">
            <!-- Header -->
            <div class="new-group-header">
                <button class="text-white" onclick="showNewGroupModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
                <h3 class="text-lg font-semibold text-white">New group</h3>
            </div>
            
            <!-- Group Icon & Name -->
            <div class="group-name-section">
                <div class="group-icon-placeholder" onclick="selectGroupIcon()">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <input type="text" id="groupNameInput" placeholder="Group name" class="group-name-input" maxlength="100">
            </div>
            
            <!-- Members Preview -->
            <div class="group-section-title">Members: ${selectedGroupMembers.length}</div>
            <div class="group-members-preview">
                ${selectedGroupMembers.map(m => `
                    <div class="member-preview-item">
                        <div class="avatar-placeholder">${m.username.charAt(0).toUpperCase()}</div>
                        <span class="text-sm">${m.username}</span>
                    </div>
                `).join('')}
            </div>
            
            <!-- Create Button -->
            <button class="btn-primary w-full py-3 rounded-lg mt-4" onclick="createGroup()">
                Create Group
            </button>
        </div>
    `;

    document.getElementById('groupNameInput')?.focus();
}

// Create the group
async function createGroup() {
    const nameInput = document.getElementById('groupNameInput');
    const groupName = nameInput?.value?.trim();

    if (!groupName) {
        showToast('Please enter a group name', 'error');
        return;
    }

    if (selectedGroupMembers.length === 0) {
        showToast('Please add at least one member', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: groupName,
                members: selectedGroupMembers.map(m => m.id)
            })
        });

        if (response.ok) {
            const data = await response.json();
            showToast('Group created successfully!', 'success');
            closeNewGroupModal();

            // Reload rooms and open the new group
            if (typeof loadRooms === 'function') {
                await loadRooms();
            }

            // Open the new group chat
            if (data.room_id && typeof openChat === 'function') {
                openChat(data.room_id, 'room');
            }
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to create group', 'error');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Failed to create group', 'error');
    }
}

// Close new group modal
function closeNewGroupModal() {
    document.getElementById('newGroupModal')?.remove();
    selectedGroupMembers = [];
}

// Show add contact modal - uses existing functionality
function showAddContactModal() {
    document.getElementById('newChatDropdown')?.classList.add('hidden');
    const addContactPanel = document.getElementById('addContactPanel');
    if (addContactPanel) {
        addContactPanel.classList.toggle('hidden');
    }
}

// Open camera
async function openCamera() {
    document.getElementById('newChatDropdown')?.classList.add('hidden');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        // Create camera modal
        const modal = document.createElement('div');
        modal.className = 'pin-modal';
        modal.id = 'cameraModal';
        modal.innerHTML = `
            <div class="pin-modal-content" style="max-width: 500px;">
                <h3 class="pin-modal-title">Camera</h3>
                <video id="cameraPreview" autoplay playsinline style="width: 100%; border-radius: 12px; margin-bottom: 16px;"></video>
                <div class="flex gap-3 justify-center">
                    <button class="btn-secondary px-6 py-2 rounded-lg" onclick="closeCameraModal()">Close</button>
                    <button class="btn-primary px-6 py-2 rounded-lg" onclick="capturePhoto()">
                        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z">
                            </path>
                        </svg>
                        Capture
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const video = document.getElementById('cameraPreview');
        video.srcObject = stream;
        window.cameraStream = stream;

    } catch (err) {
        console.error('Camera access error:', err);
        showToast('Could not access camera', 'error');
    }
}

// Close camera modal
function closeCameraModal() {
    const modal = document.getElementById('cameraModal');
    if (modal) {
        modal.remove();
    }
    if (window.cameraStream) {
        window.cameraStream.getTracks().forEach(track => track.stop());
        window.cameraStream = null;
    }
}

// Capture photo
function capturePhoto() {
    const video = document.getElementById('cameraPreview');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
        // Create file from blob
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // If we have a current chat, send the photo
        if (AppState.currentChat && typeof sendFile === 'function') {
            showToast('Photo captured! Select a chat to send.', 'success');
        } else {
            showToast('Photo captured!', 'success');
        }

        closeCameraModal();
    }, 'image/jpeg');
}

// Export functions
window.openArchivedChats = openArchivedChats;
window.archiveChat = archiveChat;
window.unarchiveChat = unarchiveChat;
window.closePinModal = closePinModal;
window.submitPinSetup = submitPinSetup;
window.submitPinVerify = submitPinVerify;
window.showForgotPinModal = showForgotPinModal;
window.requestPinOTP = requestPinOTP;
window.submitPinReset = submitPinReset;
window.showArchiveContextMenu = showArchiveContextMenu;
window.showNewGroupModal = showNewGroupModal;
window.showAddContactModal = showAddContactModal;
window.openCamera = openCamera;
window.closeCameraModal = closeCameraModal;
window.capturePhoto = capturePhoto;
window.openAriseChat = openAriseChat;
window.saveNavigationState = saveNavigationState;
window.sendAriseMessage = sendAriseMessage;
window.toggleGroupMember = toggleGroupMember;
window.showGroupNameStep = showGroupNameStep;
window.createGroup = createGroup;
window.closeNewGroupModal = closeNewGroupModal;
