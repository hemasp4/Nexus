/**
 * NexusChat - Authentication Handler
 * Handles login, registration, and session management
 */

const API_URL = window.location.origin;

// DOM Elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        const eyeOpen = this.querySelector('.eye-open');
        const eyeClosed = this.querySelector('.eye-closed');

        if (input.type === 'password') {
            input.type = 'text';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
        } else {
            input.type = 'password';
            eyeOpen.classList.remove('hidden');
            eyeClosed.classList.add('hidden');
        }
    });
});

// Tab switching
loginTab.addEventListener('click', () => switchTab('login'));
registerTab.addEventListener('click', () => switchTab('register'));

function switchTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
    hideMessage();
}

// Show/hide loading
function showLoading() {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
}

// Show message
function showMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.classList.remove('hidden', 'bg-red-500/20', 'text-red-400', 'bg-green-500/20', 'text-green-400');

    if (type === 'error') {
        authMessage.classList.add('bg-red-500/20', 'text-red-400');
    } else {
        authMessage.classList.add('bg-green-500/20', 'text-green-400');
    }
}

function hideMessage() {
    authMessage.classList.add('hidden');
}

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading();
    hideMessage();

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showMessage('Login successful! Redirecting...', 'success');

        // Redirect to chat
        setTimeout(() => {
            window.location.href = '/chat';
        }, 1000);

    } catch (error) {
        showMessage(error.message);
    } finally {
        hideLoading();
    }
});

// Register handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    console.log('Attempting registration for:', email);
    showLoading();
    hideMessage();

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);

        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showMessage('Account created! Redirecting...', 'success');
        console.log('Registration successful, redirecting...');

        // Redirect to chat
        setTimeout(() => {
            window.location.href = '/chat';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message || 'Registration failed. Please try again.');
    } finally {
        hideLoading();
    }
});

// Check if already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        fetch(`${API_URL}/api/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/chat';
                } else {
                    // Token expired, clear storage
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            })
            .catch(() => {
                // Network error, keep on login page
            });
    }
}

// Initialize: ensure login tab is shown by default
switchTab('login');

// TESTING MODE: Clear stored credentials to force fresh login
// Remove these lines when done testing
localStorage.removeItem('token');
localStorage.removeItem('user');

// Check auth on page load - DISABLED for testing multiple users
// Uncomment to auto-redirect logged-in users to chat
// checkAuth();
