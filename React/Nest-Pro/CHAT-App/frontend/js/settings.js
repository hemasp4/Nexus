/**
 * NexusChat - Settings Controller
 * Handles all settings panel functionality
 */

// Settings State
const SettingsState = {
    settings: null,
    blockedUsers: [],
    currentSection: 'general'
};

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // Load saved theme immediately
    loadThemeFromStorage();

    // Menu button opens settings
    document.getElementById('menuBtn')?.addEventListener('click', openSettings);

    // Close settings button
    document.getElementById('closeSettingsBtn')?.addEventListener('click', closeSettings);

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Navigation items
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Theme options
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => setTheme(option.dataset.theme));
    });

    // Wallpaper options
    document.querySelectorAll('.wallpaper-option').forEach(option => {
        option.addEventListener('click', () => setWallpaper(option.dataset.wallpaper));
    });

    // Change password
    document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
    document.getElementById('closeChangePasswordModal')?.addEventListener('click', closeChangePasswordModal);
    document.getElementById('cancelChangePassword')?.addEventListener('click', closeChangePasswordModal);
    document.getElementById('confirmChangePassword')?.addEventListener('click', changePassword);

    // Blocked contacts
    document.getElementById('blockedContactsBtn')?.addEventListener('click', openBlockedContactsModal);
    document.getElementById('closeBlockedContactsModal')?.addEventListener('click', closeBlockedContactsModal);

    // Two-factor button (placeholder)
    document.getElementById('twoFactorBtn')?.addEventListener('click', () => {
        showToast('Two-factor authentication coming soon!', 'info');
    });

    // Clear cache button
    document.getElementById('clearCacheBtn')?.addEventListener('click', clearCache);

    // Avatar change
    document.getElementById('settingsAvatar')?.addEventListener('click', () => {
        document.getElementById('avatarInput')?.click();
    });

    document.getElementById('avatarInput')?.addEventListener('change', handleAvatarChange);

    // Custom wallpaper
    document.getElementById('wallpaperInput')?.addEventListener('change', handleWallpaperChange);

    // Settings auto-save on change
    setupAutoSave();

    // Keyboard shortcut for settings
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === ',') {
            e.preventDefault();
            openSettings();
        }
    });

    // Close modals on overlay click
    document.getElementById('settingsModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });
}

function loadThemeFromStorage() {
    const savedTheme = localStorage.getItem('nexuschat_theme') || 'dark';
    applyTheme(savedTheme);
    updateThemeUI(savedTheme);
}

async function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    // Load current settings
    await loadSettings();

    // Update profile info
    updateProfileInfo();

    // Show modal
    modal.classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal')?.classList.remove('active');
}

async function loadSettings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            SettingsState.settings = await response.json();
            applySettingsToUI();
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        // Use defaults
        SettingsState.settings = getDefaultSettings();
        applySettingsToUI();
    }
}

function getDefaultSettings() {
    return {
        theme: 'dark',
        font_size: 'medium',
        chat_wallpaper: 'default',
        enter_is_send: true,
        media_auto_download: 'wifi',
        notification_messages: true,
        notification_groups: true,
        notification_calls: true,
        notification_sounds: true,
        last_seen_visibility: 'everyone',
        profile_photo_visibility: 'everyone',
        about_visibility: 'everyone',
        read_receipts: true
    };
}

function applySettingsToUI() {
    const s = SettingsState.settings;
    if (!s) return;

    // Theme
    updateThemeUI(s.theme);

    // Font size
    document.getElementById('fontSizeSelect').value = s.font_size;
    applyFontSize(s.font_size);

    // Wallpaper
    selectWallpaper(s.chat_wallpaper || 'default');

    // Toggles
    setToggle('enterIsSend', s.enter_is_send);
    setToggle('readReceipts', s.read_receipts);
    setToggle('notificationMessages', s.notification_messages);
    setToggle('notificationGroups', s.notification_groups);
    setToggle('notificationCalls', s.notification_calls);
    setToggle('notificationSounds', s.notification_sounds);

    // Selects
    setSelectValue('lastSeenVisibility', s.last_seen_visibility);
    setSelectValue('profilePhotoVisibility', s.profile_photo_visibility);
    setSelectValue('aboutVisibility', s.about_visibility);
    setSelectValue('mediaAutoDownload', s.media_auto_download);

    // About text
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('aboutInput').value = user.about || 'Hey there! I\'m using NexusChat';
}

function setToggle(id, value) {
    const toggle = document.getElementById(id);
    if (toggle) toggle.checked = value;
}

function setSelectValue(id, value) {
    const select = document.getElementById(id);
    if (select) select.value = value;
}

function updateProfileInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    document.getElementById('settingsUsername').textContent = user.username || 'User';
    document.getElementById('settingsAbout').textContent = user.about || 'Hey there! I\'m using NexusChat';

    const avatarContainer = document.getElementById('settingsAvatar');
    if (avatarContainer) {
        if (user.avatar) {
            avatarContainer.innerHTML = `
                <img src="${API_URL}/api/files/${user.avatar}" alt="Avatar">
                <div class="avatar-edit-overlay">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
            `;
        } else {
            avatarContainer.innerHTML = `
                <div class="avatar-placeholder">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                <div class="avatar-edit-overlay">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
            `;
        }
    }
}

function switchSection(section) {
    SettingsState.currentSection = section;

    // Update nav
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update content
    document.querySelectorAll('.settings-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${section}`);
    });
}

// Theme Functions
function setTheme(theme) {
    applyTheme(theme);
    updateThemeUI(theme);
    saveSettings({ theme });
    localStorage.setItem('nexuschat_theme', theme);
}

function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('light', !prefersDark);
    } else if (theme === 'light') {
        root.classList.add('light');
    } else {
        root.classList.remove('light');
    }
}

function updateThemeUI(theme) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === theme);
    });
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const savedTheme = localStorage.getItem('nexuschat_theme');
    if (savedTheme === 'system') {
        applyTheme('system');
    }
});

// Wallpaper Functions
function setWallpaper(wallpaper) {
    if (wallpaper === 'custom') {
        document.getElementById('wallpaperInput')?.click();
        return;
    }

    applyWallpaper(wallpaper);
    selectWallpaper(wallpaper);
    saveSettings({ chat_wallpaper: wallpaper });
}

function selectWallpaper(wallpaper) {
    document.querySelectorAll('.wallpaper-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.wallpaper === wallpaper);
    });
}

function applyWallpaper(wallpaper) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    // Remove all wallpaper classes
    container.classList.remove('wallpaper-gradient1', 'wallpaper-gradient2', 'wallpaper-gradient3');

    if (wallpaper && wallpaper.startsWith('gradient')) {
        container.classList.add(`wallpaper-${wallpaper}`);
    }
}

async function handleWallpaperChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // For now, just show a toast - custom wallpapers would need to be uploaded
    showToast('Custom wallpapers coming soon!', 'info');
    e.target.value = '';
}

// Font Size
function applyFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (size !== 'medium') {
        document.body.classList.add(`font-${size}`);
    }
}

// Avatar Change
async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        const uploadResponse = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Upload failed');
        }

        const uploadData = await uploadResponse.json();

        // Update user profile
        const updateResponse = await fetch(`${API_URL}/api/users/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ avatar: uploadData.file_id })
        });

        if (updateResponse.ok) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.avatar = uploadData.file_id;
            localStorage.setItem('user', JSON.stringify(user));

            updateProfileInfo();
            showToast('Profile picture updated!', 'success');
        }
    } catch (error) {
        console.error('Avatar update failed:', error);
        showToast('Failed to update profile picture', 'error');
    }

    e.target.value = '';
}

// Password Change
function openChangePasswordModal() {
    document.getElementById('changePasswordModal')?.classList.add('active');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal')?.classList.remove('active');
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/settings/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_password: currentPassword,
                new_password: newPassword
            })
        });

        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            closeChangePasswordModal();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Password change failed:', error);
        showToast('Failed to change password', 'error');
    }
}

// Blocked Contacts
async function openBlockedContactsModal() {
    document.getElementById('blockedContactsModal')?.classList.add('active');
    await loadBlockedContacts();
}

function closeBlockedContactsModal() {
    document.getElementById('blockedContactsModal')?.classList.remove('active');
}

async function loadBlockedContacts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/blocked`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            SettingsState.blockedUsers = await response.json();
            renderBlockedContacts();
            updateBlockedCount();
        }
    } catch (error) {
        console.error('Failed to load blocked contacts:', error);
    }
}

function renderBlockedContacts() {
    const container = document.getElementById('blockedContactsList');
    if (!container) return;

    if (SettingsState.blockedUsers.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No blocked contacts</p>';
        return;
    }

    container.innerHTML = SettingsState.blockedUsers.map(user => `
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
                </div>
            </div>
            <button class="btn-secondary px-3 py-1.5 rounded-lg text-sm" onclick="unblockUser('${user.id}')">
                Unblock
            </button>
        </div>
    `).join('');
}

function updateBlockedCount() {
    const countEl = document.getElementById('blockedCount');
    if (countEl) {
        const count = SettingsState.blockedUsers.length;
        countEl.textContent = `${count} blocked contact${count !== 1 ? 's' : ''}`;
    }
}

async function unblockUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/block/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('User unblocked', 'success');
            await loadBlockedContacts();
        }
    } catch (error) {
        console.error('Failed to unblock user:', error);
        showToast('Failed to unblock user', 'error');
    }
}

// Block user function (called from chat)
async function blockUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/block/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('User blocked', 'success');
            return true;
        }
    } catch (error) {
        console.error('Failed to block user:', error);
        showToast('Failed to block user', 'error');
    }
    return false;
}

// Clear Cache
function clearCache() {
    if (confirm('Clear all cached data? This will not delete your messages.')) {
        // Clear local storage except auth
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const theme = localStorage.getItem('nexuschat_theme');

        localStorage.clear();

        if (token) localStorage.setItem('token', token);
        if (user) localStorage.setItem('user', user);
        if (theme) localStorage.setItem('nexuschat_theme', theme);

        showToast('Cache cleared!', 'success');
    }
}

// Auto-save settings
function setupAutoSave() {
    // Toggles
    ['enterIsSend', 'readReceipts', 'notificationMessages', 'notificationGroups',
        'notificationCalls', 'notificationSounds'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                saveSettings({ [id.replace(/([A-Z])/g, '_$1').toLowerCase()]: e.target.checked });
            });
        });

    // Selects
    ['lastSeenVisibility', 'profilePhotoVisibility', 'aboutVisibility',
        'mediaAutoDownload', 'fontSizeSelect'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                const key = id.replace(/([A-Z])/g, '_$1').toLowerCase().replace('_select', '');
                saveSettings({ [key]: e.target.value });

                if (id === 'fontSizeSelect') {
                    applyFontSize(e.target.value);
                }
            });
        });

    // About input with debounce
    let aboutTimeout;
    document.getElementById('aboutInput')?.addEventListener('input', (e) => {
        clearTimeout(aboutTimeout);
        aboutTimeout = setTimeout(() => {
            updateAbout(e.target.value);
        }, 500);
    });
}

async function saveSettings(updates) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

async function updateAbout(about) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ about })
        });

        if (response.ok) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.about = about;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('settingsAbout').textContent = about;
        }
    } catch (error) {
        console.error('Failed to update about:', error);
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Make functions globally available
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.unblockUser = unblockUser;
window.blockUser = blockUser;
