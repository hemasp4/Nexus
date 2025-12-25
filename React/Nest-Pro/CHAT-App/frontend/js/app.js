/**
 * NexusChat - Main Application
 * Handles app initialization and state management
 */

const API_URL = window.location.origin;

// Application State
const AppState = {
    user: null,
    token: null,
    currentChat: null,
    currentChatType: 'user', // 'user' or 'room'
    contacts: [],
    rooms: [],
    messages: {},
    onlineUsers: new Set(),
    isConnected: false,
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        window.location.href = '/';
        return;
    }

    AppState.token = token;
    AppState.user = JSON.parse(user);

    // Initialize components
    initUI();
    await loadContacts();
    await loadRooms();
    initWebSocket();

    console.log('NexusChat initialized');
}

// Initialize UI event listeners
function initUI() {
    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => switchSidebarTab(tab.dataset.tab));
    });

    // Search button
    document.getElementById('searchBtn').addEventListener('click', toggleSearch);

    // Add contact button
    document.getElementById('addContactBtn').addEventListener('click', () => {
        document.getElementById('addContactModal').classList.add('active');
    });

    // Close add contact modal
    document.getElementById('closeAddContactModal').addEventListener('click', () => {
        document.getElementById('addContactModal').classList.remove('active');
    });

    // Contact search
    let searchTimeout;
    document.getElementById('contactSearchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchContacts(e.target.value), 300);
    });

    // Close create group modal
    document.getElementById('closeCreateGroupModal')?.addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.remove('active');
    });

    document.getElementById('cancelCreateGroup')?.addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.remove('active');
    });

    document.getElementById('confirmCreateGroup')?.addEventListener('click', createGroup);

    // Back button (mobile)
    document.getElementById('backBtn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('activeChat').classList.add('hidden');
        document.getElementById('activeChat').classList.remove('flex');
        document.getElementById('emptyState').classList.remove('hidden');
    });

    // Menu button
    document.getElementById('menuBtn')?.addEventListener('click', showMenu);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Load contacts
async function loadContacts() {
    try {
        const response = await fetch(`${API_URL}/api/users/contacts/list`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            AppState.contacts = await response.json();
            renderContacts();
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

// Load rooms
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            AppState.rooms = await response.json();
        }
    } catch (error) {
        console.error('Failed to load rooms:', error);
    }
}

// Render contacts list
function renderContacts() {
    const contactList = document.getElementById('contactList');

    if (AppState.contacts.length === 0) {
        contactList.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <p>No contacts yet</p>
                <p class="text-sm mt-2">Click + to add contacts</p>
            </div>
        `;
        return;
    }

    // Filter out archived contacts (unless in archived view)
    const archivedChats = window.archiveState?.archivedChats || [];
    const visibleContacts = AppState.contacts.filter(c => !archivedChats.includes(c.id));

    if (visibleContacts.length === 0) {
        contactList.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <p>No chats</p>
                <p class="text-sm mt-2">All chats are archived</p>
            </div>
        `;
        return;
    }

    contactList.innerHTML = visibleContacts.map(contact => `
        <div class="contact-item" data-user-id="${contact.id}" 
             onclick="openChat('${contact.id}', 'user')"
             oncontextmenu="showArchiveContextMenu(event, '${contact.id}', false)">
            <div class="contact-avatar">
                ${contact.avatar
            ? `<img src="${API_URL}/api/files/${contact.avatar}" alt="${contact.username}">`
            : `<div class="avatar-placeholder">${contact.username.charAt(0).toUpperCase()}</div>`
        }
                <div class="status-dot ${AppState.onlineUsers.has(contact.id) ? 'online' : 'offline'}"></div>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username}</div>
                <div class="contact-last-message">${contact.about || 'Hey there!'}</div>
            </div>
            <div class="contact-meta">
                <span class="contact-time"></span>
            </div>
        </div>
    `).join('');
}

// Render rooms list
function renderRooms() {
    const contactList = document.getElementById('contactList');

    if (AppState.rooms.length === 0) {
        contactList.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <p>No groups yet</p>
                <button class="btn-primary px-4 py-2 rounded-lg mt-4 text-sm" onclick="showCreateGroupModal()">
                    Create Group
                </button>
            </div>
        `;
        return;
    }

    contactList.innerHTML = AppState.rooms.map(room => `
        <div class="contact-item" data-room-id="${room.id}" onclick="openChat('${room.id}', 'room')">
            <div class="contact-avatar">
                ${room.avatar
            ? `<img src="${API_URL}/api/files/${room.avatar}" alt="${room.name}">`
            : `<div class="avatar-placeholder">👥</div>`
        }
            </div>
            <div class="contact-info">
                <div class="contact-name">${room.name}</div>
                <div class="contact-last-message">${room.last_message || room.description || `${room.members.length} members`}</div>
            </div>
            <div class="contact-meta">
                <span class="contact-time">${room.last_message_time ? formatTime(room.last_message_time) : ''}</span>
            </div>
        </div>
    `).join('');
}

// Switch sidebar tab
function switchSidebarTab(tab) {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    if (tab === 'chats') {
        renderContacts();
        document.getElementById('arisePanel').classList.add('hidden');
    } else if (tab === 'groups') {
        renderRooms();
        document.getElementById('arisePanel').classList.add('hidden');
    } else if (tab === 'arise') {
        document.getElementById('arisePanel').classList.remove('hidden');
    }
}

// Toggle search
function toggleSearch() {
    const searchBox = document.getElementById('searchBox');
    searchBox.classList.toggle('hidden');
    if (!searchBox.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    }
}

// Search contacts
async function searchContacts(query) {
    if (!query || query.length < 2) {
        document.getElementById('contactSearchResults').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            renderSearchResults(users);
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Render search results
function renderSearchResults(users) {
    const container = document.getElementById('contactSearchResults');

    if (users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No users found</p>';
        return;
    }

    container.innerHTML = users.map(user => {
        const isContact = AppState.contacts.some(c => c.id === user.id);
        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl overflow-hidden">
                        ${user.avatar
                ? `<img src="${API_URL}/api/files/${user.avatar}" alt="${user.username}" class="w-full h-full object-cover">`
                : `<div class="avatar-placeholder w-full h-full flex items-center justify-center">${user.username.charAt(0).toUpperCase()}</div>`
            }
                    </div>
                    <div>
                        <div class="font-medium text-white">${user.username}</div>
                        <div class="text-sm text-gray-400">${user.about || ''}</div>
                    </div>
                </div>
                ${isContact
                ? '<span class="text-sm text-green-400">✓ Added</span>'
                : `<button class="btn-primary px-3 py-1.5 rounded-lg text-sm" onclick="addContact('${user.id}')">Add</button>`
            }
            </div>
        `;
    }).join('');
}

// Add contact
async function addContact(userId) {
    try {
        const response = await fetch(`${API_URL}/api/users/contacts/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            showToast('Contact added successfully!', 'success');
            await loadContacts();
            document.getElementById('addContactModal').classList.remove('active');
        }
    } catch (error) {
        showToast('Failed to add contact', 'error');
    }
}

// Show create group modal
function showCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    const membersList = document.getElementById('groupMembersList');

    membersList.innerHTML = AppState.contacts.map(contact => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-700 cursor-pointer">
            <input type="checkbox" value="${contact.id}" class="rounded border-gray-600">
            <span class="text-white">${contact.username}</span>
        </label>
    `).join('');

    modal.classList.add('active');
}

// Create group
async function createGroup() {
    const name = document.getElementById('groupNameInput').value.trim();
    const description = document.getElementById('groupDescInput').value.trim();
    const memberCheckboxes = document.querySelectorAll('#groupMembersList input:checked');
    const members = Array.from(memberCheckboxes).map(cb => cb.value);

    if (!name) {
        showToast('Please enter a group name', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, members })
        });

        if (response.ok) {
            showToast('Group created!', 'success');
            await loadRooms();
            document.getElementById('createGroupModal').classList.remove('active');
            switchSidebarTab('groups');
        }
    } catch (error) {
        showToast('Failed to create group', 'error');
    }
}

// Show menu
function showMenu() {
    // Open settings panel
    if (typeof openSettings === 'function') {
        openSettings();
    } else {
        // Fallback if settings not loaded
        if (confirm('Logout?')) {
            logout();
        }
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions globally accessible
window.loadContacts = loadContacts;
window.renderContacts = renderContacts;
window.loadRooms = loadRooms;
window.addContact = addContact;
window.showCreateGroupModal = showCreateGroupModal;
window.showToast = showToast;
window.AppState = AppState;
window.API_URL = API_URL;
