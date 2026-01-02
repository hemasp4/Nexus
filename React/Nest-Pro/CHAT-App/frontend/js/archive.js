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
        profile: 'Profile',
        arise: 'Arise AI'
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
            // Restore full chat area structure if needed
            restoreChatArea();
            // Force reload contacts with fresh event handlers
            loadContacts();
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
        case 'arise':
            archiveState.currentView = 'arise';
            saveNavigationState('arise');
            renderAriseView();
            break;
        default:
            saveNavigationState(navType);
            showToast(`${titles[navType]} coming soon!`, 'info');
    }
}

// Render Arise AI View (ChatGPT-like interface)
function renderAriseView() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    // Hide sidebar contact list and show AI view
    const contactList = document.getElementById('contactList');
    if (contactList) contactList.style.display = 'none';

    chatArea.innerHTML = `
        <div class="arise-container">
            <!-- AI Sidebar -->
            <div class="arise-sidebar" id="ariseSidebar">
                <div class="arise-sidebar-header">
                    <button class="arise-new-chat-btn" onclick="newAriseChat()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        New chat
                    </button>
                    <button class="arise-toggle-btn" onclick="toggleAriseSidebar()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="arise-search">
                    <input type="text" placeholder="Search chats..." 
                           onkeyup="searchAriseConversations(this.value)">
                </div>
                
                <div class="arise-conversation-list" id="ariseConversationList">
                    <!-- Conversations will be rendered here -->
                </div>
                
                <!-- Projects Section -->
                <div class="arise-projects-section">
                    <div class="arise-section-title">Projects</div>
                    <div id="ariseProjectsList"></div>
                    <div class="arise-new-project-btn" onclick="showNewProjectModal()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        New project
                    </div>
                </div>
            </div>
            
            <!-- Chat Area -->
            <div class="arise-chat-area" id="ariseChatArea">
                <!-- Header with Model Selector -->
                <div class="arise-chat-header">
                    <div class="arise-model-selector">
                        <button class="arise-model-btn" id="ariseModelBtn" onclick="toggleModelSelector()">
                            <span class="model-name">Gemini Pro</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="arise-model-menu" id="ariseModelMenu">
                            <!-- Models will be rendered here -->
                        </div>
                    </div>
                </div>
                
                <!-- Messages -->
                <div class="arise-messages" id="ariseMessages">
                    <!-- Messages or welcome screen will be rendered here -->
                </div>
                
                <!-- Input Area -->
                <div class="arise-input-area">
                    <div class="arise-attachments" id="ariseAttachments"></div>
                    <div class="arise-input-container">
                        <div class="arise-attach-btn">
                            <button onclick="toggleAriseAttachMenu()" class="p-2 text-gray-400 hover:text-white">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                            </button>
                            <div class="arise-attach-menu" id="ariseAttachMenu">
                                <div class="arise-attach-option" onclick="handleAriseFileAttach()">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                    </svg>
                                    Add photos & files
                                </div>
                                <div class="arise-attach-option" onclick="showToast('Create image coming soon!', 'info')">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Create image
                                </div>
                            </div>
                        </div>
                        <div class="arise-input-wrapper">
                            <textarea id="ariseInput" placeholder="Ask anything..." rows="1"
                                      onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendToAriseEnhanced();}"
                                      oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,150)+'px';"></textarea>
                        </div>
                        <button class="arise-send-btn" onclick="sendToAriseEnhanced()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize the AI interface
    if (typeof renderAriseSidebar === 'function') renderAriseSidebar();
    if (typeof renderAriseChat === 'function') renderAriseChat();
    if (typeof renderModelSelector === 'function') renderModelSelector();
    if (typeof renderAriseProjects === 'function') renderAriseProjects();
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

// Open Arise chat in main area - now uses new ChatGPT-like interface
function openAriseChat() {
    archiveState.currentView = 'arise';
    saveNavigationState('arise');
    document.getElementById('sidebarTitle').textContent = 'Arise AI';

    // Use the new enhanced AI interface
    renderAriseView();
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

    // Remove any existing modal to prevent stacking
    document.getElementById('newGroupModal')?.remove();

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
                    <p class="text-sm text-gray-400" id="memberCount">0/${AppState.contacts?.length || 0}</p>
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
        countEl.textContent = `${selectedGroupMembers.length}/${AppState.contacts?.length || 0}`;
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
                <button class="text-white" onclick="goBackToMemberSelect()">
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
                <input type="text" id="modalGroupNameInput" placeholder="Group name" class="group-name-input" maxlength="100">
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

    document.getElementById('modalGroupNameInput')?.focus();
}

// Create the group
async function createGroup() {
    const nameInput = document.getElementById('modalGroupNameInput');
    console.log('Name input element:', nameInput);
    console.log('Name input value:', nameInput?.value);

    const groupName = nameInput?.value?.trim();

    console.log('Creating group:', groupName);
    console.log('Selected members:', selectedGroupMembers);

    if (!groupName) {
        showToast('Please enter a group name', 'error');
        return;
    }

    if (selectedGroupMembers.length === 0) {
        showToast('Please add at least one member', 'error');
        return;
    }

    console.log('Validations passed, about to call API');

    try {
        const payload = {
            name: groupName,
            members: selectedGroupMembers.map(m => m.id)
        };
        console.log('API Payload:', payload);

        const response = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Group created:', data);

            // Step 1: Show success message
            showToast('Group created successfully!', 'success');
            console.log('Step 1: Toast shown');

            // Step 2: Close the modal - CRITICAL
            try {
                const modal = document.getElementById('newGroupModal');
                if (modal) {
                    modal.remove();
                    console.log('Step 2: Modal removed');
                } else {
                    console.log('Step 2: Modal not found, already removed?');
                }
                selectedGroupMembers = [];
            } catch (e) {
                console.error('Error closing modal:', e);
            }

            // Step 3: Update archiveState and reload rooms
            try {
                if (window.archiveState) {
                    window.archiveState.currentView = 'groups';
                }
                if (typeof window.loadRooms === 'function') {
                    await window.loadRooms();
                    console.log('Step 3: Rooms loaded');
                }
            } catch (e) {
                console.error('Error loading rooms:', e);
            }

            // Step 4: Navigate to groups section
            try {
                const navBtns = document.querySelectorAll('.nav-btn');
                navBtns.forEach(btn => btn.classList.remove('active'));
                const groupsBtn = document.querySelector('[data-nav="groups"]');
                if (groupsBtn) {
                    groupsBtn.classList.add('active');
                    console.log('Step 4: Groups nav activated');
                }
            } catch (e) {
                console.error('Error navigating:', e);
            }

            // Step 5: Render groups list
            try {
                if (typeof window.renderGroups === 'function') {
                    window.archiveState.currentView = 'groups'; // Ensure view is set
                    window.renderGroups();
                    console.log('Step 5: Groups rendered');
                }
            } catch (e) {
                console.error('Error rendering groups:', e);
            }

            // Step 6: Open the new group chat
            try {
                if (data.id && typeof window.openChat === 'function') {
                    setTimeout(() => {
                        window.openChat(data.id, 'room');
                        console.log('Step 6: Chat opened');
                    }, 200);
                }
            } catch (e) {
                console.error('Error opening chat:', e);
            }
        } else {
            const errorText = await response.text();
            console.error('Group creation failed:', response.status, errorText);
            try {
                const error = JSON.parse(errorText);
                showToast(error.detail || 'Failed to create group', 'error');
            } catch {
                showToast('Failed to create group: ' + response.status, 'error');
            }
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Failed to create group: ' + error.message, 'error');
    }
}

// Close new group modal
function closeNewGroupModal() {
    document.getElementById('newGroupModal')?.remove();
    selectedGroupMembers = [];
    window.selectedGroupIcon = null;
}

// Go back to member selection step (without resetting selected members)
function goBackToMemberSelect() {
    const modal = document.getElementById('newGroupModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="new-group-modal">
            <!-- Header -->
            <div class="new-group-header">
                <button class="text-white" onclick="closeNewGroupModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
                <h3 class="text-lg font-semibold text-white">New group</h3>
                <span class="text-sm text-gray-400" id="memberCount">${selectedGroupMembers.length}/${AppState.contacts?.length || 0}</span>
            </div>
            
            <!-- Selected Members -->
            <div class="selected-members-container" id="selectedMembersContainer">
                <div class="selected-members" id="selectedMembers"></div>
                <input type="text" id="groupSearchInput" placeholder="Search contacts..." class="group-search-input">
            </div>
            
            <!-- Action Buttons -->
            <div class="group-action-buttons">
                <button class="btn-primary flex-1 py-3 rounded-lg" id="nextGroupBtn" onclick="showGroupNameStep()" ${selectedGroupMembers.length === 0 ? 'disabled' : ''}>Next</button>
                <button class="btn-secondary flex-1 py-3 rounded-lg" onclick="closeNewGroupModal()">Cancel</button>
            </div>
            
            <!-- Contacts List -->
            <div class="group-section-title">All contacts</div>
            <div class="group-contacts-list" id="groupContactsList">
                ${renderGroupContacts()}
            </div>
        </div>
    `;

    // Update selected members UI
    updateSelectedMembersUI();

    // Setup search
    document.getElementById('groupSearchInput')?.addEventListener('input', (e) => {
        filterGroupContacts(e.target.value);
    });
}

// Select group icon
function selectGroupIcon() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Create preview URL
        const url = URL.createObjectURL(file);
        window.selectedGroupIcon = file;

        // Update the icon placeholder
        const iconPlaceholder = document.querySelector('.group-icon-placeholder');
        if (iconPlaceholder) {
            iconPlaceholder.innerHTML = `<img src="${url}" class="group-icon-preview" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    };
    input.click();
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
window.goBackToMemberSelect = goBackToMemberSelect;
window.selectGroupIcon = selectGroupIcon;
window.restoreChatArea = restoreChatArea;

// Restore chat area with full structure (needed when switching from status/other views)
function restoreChatArea() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    // Check if activeChat element exists, if not, restore full structure
    if (!document.getElementById('activeChat')) {
        chatArea.innerHTML = `
            <!-- Empty State -->
            <div class="empty-state" id="emptyState">
                <div class="empty-state-icon">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z">
                        </path>
                    </svg>
                </div>
                <h3>Welcome to NexusChat</h3>
                <p>Select a conversation to start chatting or click the + button to add a new contact.</p>
            </div>

            <!-- Active Chat (Hidden by default) -->
            <div class="hidden flex-col h-full" id="activeChat">
                <!-- Chat Header -->
                <header class="chat-header">
                    <div class="chat-header-info">
                        <button class="btn-icon md:hidden mr-2" id="backBtn">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        <div class="chat-header-avatar">
                            <div class="avatar-placeholder" id="chatAvatar">U</div>
                        </div>
                        <div class="chat-header-details">
                            <h3 id="chatName">User Name</h3>
                            <span class="status" id="chatStatus">Online</span>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <button class="btn-icon" id="voiceCallBtn" title="Voice Call">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
                                </path>
                            </svg>
                        </button>
                        <button class="btn-icon" id="videoCallBtn" title="Video Call">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z">
                                </path>
                            </svg>
                        </button>
                        <button class="btn-icon" id="chatInfoBtn" title="Info">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    </div>
                </header>

                <!-- Messages Container -->
                <div class="messages-container" id="messagesContainer">
                    <!-- Messages will be loaded here -->
                </div>

                <!-- Typing Indicator -->
                <div class="px-6 py-2 hidden" id="typingIndicator">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                <!-- Message Input -->
                <div class="message-input-container">
                    <div class="message-input-wrapper">
                        <div class="message-input-actions">
                            <button class="input-action-btn" id="emojiBtn" title="Emoji">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                                    </path>
                                </svg>
                            </button>
                            <button class="input-action-btn" id="attachBtn" title="Attach File">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13">
                                    </path>
                                </svg>
                            </button>
                        </div>
                        <input type="text" class="message-input" id="messageInput" placeholder="Type a message...">
                        <button class="send-btn" id="sendBtn">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Re-attach event listeners for send button
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        if (sendBtn && typeof handleSend === 'function') {
            sendBtn.addEventListener('click', handleSend);
        }
        if (messageInput && typeof handleSend === 'function') {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
        }

        // Re-attach back button listener
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById('activeChat')?.classList.add('hidden');
                document.getElementById('emptyState')?.classList.remove('hidden');
                document.getElementById('sidebar')?.classList.remove('hidden');
            });
        }
    }

    // If there was an active chat, reopen it
    if (AppState.currentChat && typeof window.openChat === 'function') {
        setTimeout(() => window.openChat(AppState.currentChat, AppState.currentChatType || 'user'), 50);
    }
}
