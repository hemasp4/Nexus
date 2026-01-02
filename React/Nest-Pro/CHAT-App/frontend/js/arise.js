/**
 * NexusChat - Arise AI Assistant (Enhanced ChatGPT-like)
 * Features: Model selection, file attachments, chat history, projects
 */

// AI State
const ariseState = {
    conversations: [],
    currentConversation: null,
    models: [
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', default: true },
        { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'google', supportsVision: true },
    ],
    selectedModel: 'gemini-pro',
    projects: [],
    sidebarOpen: true,
    isLoading: false,
    attachedFiles: []
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initAriseEnhanced);

function initAriseEnhanced() {
    loadAriseConversations();
    loadAriseProjects();
    loadAriseSettings();
}

// ==========================================
// Sidebar Functions
// ==========================================

function toggleAriseSidebar() {
    ariseState.sidebarOpen = !ariseState.sidebarOpen;
    const sidebar = document.getElementById('ariseSidebar');
    const chatArea = document.getElementById('ariseChatArea');

    if (ariseState.sidebarOpen) {
        sidebar?.classList.remove('collapsed');
        chatArea?.classList.remove('full-width');
    } else {
        sidebar?.classList.add('collapsed');
        chatArea?.classList.add('full-width');
    }
}

function renderAriseSidebar() {
    const container = document.getElementById('ariseConversationList');
    if (!container) return;

    // Group conversations by date
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const grouped = {
        today: [],
        yesterday: [],
        older: []
    };

    ariseState.conversations.forEach(conv => {
        const date = new Date(conv.updatedAt).toDateString();
        if (date === today) grouped.today.push(conv);
        else if (date === yesterday) grouped.yesterday.push(conv);
        else grouped.older.push(conv);
    });

    let html = '';

    if (grouped.today.length > 0) {
        html += `<div class="arise-section-title">Today</div>`;
        html += grouped.today.map(c => renderConversationItem(c)).join('');
    }

    if (grouped.yesterday.length > 0) {
        html += `<div class="arise-section-title">Yesterday</div>`;
        html += grouped.yesterday.map(c => renderConversationItem(c)).join('');
    }

    if (grouped.older.length > 0) {
        html += `<div class="arise-section-title">Previous</div>`;
        html += grouped.older.map(c => renderConversationItem(c)).join('');
    }

    if (ariseState.conversations.length === 0) {
        html = `
            <div class="arise-empty-state">
                <svg class="w-12 h-12 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <p class="text-gray-400">No conversations yet</p>
                <p class="text-sm text-gray-500">Start a new chat with Arise AI</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderConversationItem(conv) {
    const isActive = ariseState.currentConversation?.id === conv.id;
    return `
        <div class="arise-conv-item ${isActive ? 'active' : ''}" 
             onclick="openAriseConversation('${conv.id}')"
             data-conv-id="${conv.id}">
            <div class="arise-conv-icon">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
            </div>
            <div class="arise-conv-title">${escapeHtml(conv.title || 'New Chat')}</div>
            <div class="arise-conv-actions">
                <button onclick="event.stopPropagation(); renameAriseConversation('${conv.id}')" title="Rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                </button>
                <button onclick="event.stopPropagation(); deleteAriseConversation('${conv.id}')" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// Conversation Management
// ==========================================

function newAriseChat() {
    ariseState.currentConversation = {
        id: 'temp-' + Date.now(),
        title: 'New Chat',
        messages: [],
        model: ariseState.selectedModel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    renderAriseChat();
    renderAriseSidebar();

    // Focus on input
    document.getElementById('ariseInput')?.focus();
}

async function openAriseConversation(convId) {
    // Try to load full conversation from database
    try {
        const response = await fetch(`${API_URL}/api/arise/conversations/${convId}`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const conv = await response.json();
            ariseState.currentConversation = {
                id: conv.id,
                title: conv.title || 'New Chat',
                model: conv.model || 'gemini-pro',
                messages: conv.messages || [],
                createdAt: conv.created_at,
                updatedAt: conv.updated_at
            };
        } else {
            // Fallback to local state
            const conv = ariseState.conversations.find(c => c.id === convId);
            if (conv) ariseState.currentConversation = conv;
        }
    } catch (e) {
        console.error('Error loading conversation:', e);
        const conv = ariseState.conversations.find(c => c.id === convId);
        if (conv) ariseState.currentConversation = conv;
    }

    renderAriseChat();
    renderAriseSidebar();
}

async function deleteAriseConversation(convId) {
    if (!confirm('Delete this conversation?')) return;

    try {
        // Delete from database
        await fetch(`${API_URL}/api/arise/conversations/${convId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });
    } catch (e) {
        console.error('Error deleting from DB:', e);
    }

    // Remove from local state
    ariseState.conversations = ariseState.conversations.filter(c => c.id !== convId);
    saveAriseConversations();

    if (ariseState.currentConversation?.id === convId) {
        ariseState.currentConversation = null;
        renderAriseChat();
    }

    renderAriseSidebar();
    showToast('Conversation deleted', 'success');
}

async function renameAriseConversation(convId) {
    const conv = ariseState.conversations.find(c => c.id === convId);
    if (!conv) return;

    const newTitle = prompt('Enter new title:', conv.title);
    if (newTitle && newTitle.trim()) {
        conv.title = newTitle.trim();

        // Update in database
        try {
            await fetch(`${API_URL}/api/arise/conversations/${convId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AppState.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: conv.title })
            });
        } catch (e) {
            console.error('Error updating in DB:', e);
        }

        saveAriseConversations();
        renderAriseSidebar();
    }
}

function searchAriseConversations(query) {
    const items = document.querySelectorAll('.arise-conv-item');
    const q = query.toLowerCase();

    items.forEach(item => {
        const title = item.querySelector('.arise-conv-title')?.textContent?.toLowerCase() || '';
        item.style.display = title.includes(q) ? 'flex' : 'none';
    });
}

// ==========================================
// Chat Interface
// ==========================================

function renderAriseChat() {
    const chatContainer = document.getElementById('ariseMessages');
    if (!chatContainer) return;

    if (!ariseState.currentConversation || ariseState.currentConversation.messages.length === 0) {
        chatContainer.innerHTML = `
            <div class="arise-welcome">
                <div class="arise-logo">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h2 class="arise-welcome-title">What can I help with?</h2>
                <div class="arise-suggestions">
                    <button class="arise-suggestion" onclick="sendAriseSuggestion('Explain quantum computing in simple terms')">
                        <span>💡</span> Explain quantum computing
                    </button>
                    <button class="arise-suggestion" onclick="sendAriseSuggestion('Help me brainstorm ideas for a new project')">
                        <span>🧠</span> Brainstorm project ideas
                    </button>
                    <button class="arise-suggestion" onclick="sendAriseSuggestion('Write a professional email template')">
                        <span>✉️</span> Write a professional email
                    </button>
                    <button class="arise-suggestion" onclick="sendAriseSuggestion('Summarize the latest tech trends')">
                        <span>📊</span> Summarize tech trends
                    </button>
                </div>
            </div>
        `;
        return;
    }

    chatContainer.innerHTML = ariseState.currentConversation.messages.map(msg => `
        <div class="arise-message ${msg.role}">
            <div class="arise-message-avatar">
                ${msg.role === 'user'
            ? `<div class="avatar-placeholder">${AppState.user?.username?.charAt(0) || 'U'}</div>`
            : `<svg class="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>`
        }
            </div>
            <div class="arise-message-content">
                ${msg.role === 'user' ? escapeHtml(msg.content) : formatAriseResponse(msg.content)}
            </div>
        </div>
    `).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatAriseResponse(content) {
    // Basic markdown-like formatting
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function sendAriseSuggestion(text) {
    document.getElementById('ariseInput').value = text;
    sendToAriseEnhanced();
}

// ==========================================
// Model Selection
// ==========================================

function toggleModelSelector() {
    const menu = document.getElementById('ariseModelMenu');
    menu?.classList.toggle('active');
}

function selectAriseModel(modelId) {
    ariseState.selectedModel = modelId;
    const model = ariseState.models.find(m => m.id === modelId);

    // Update UI
    const btn = document.getElementById('ariseModelBtn');
    if (btn && model) {
        btn.querySelector('.model-name').textContent = model.name;
    }

    document.getElementById('ariseModelMenu')?.classList.remove('active');
    saveAriseSettings();
}

function renderModelSelector() {
    const menu = document.getElementById('ariseModelMenu');
    if (!menu) return;

    menu.innerHTML = ariseState.models.map(model => `
        <div class="arise-model-option ${model.id === ariseState.selectedModel ? 'selected' : ''}"
             onclick="selectAriseModel('${model.id}')">
            <div class="model-info">
                <span class="model-name">${model.name}</span>
                <span class="model-provider">${model.provider}</span>
            </div>
            ${model.id === ariseState.selectedModel ? `
                <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                </svg>
            ` : ''}
        </div>
    `).join('');
}

// ==========================================
// File Attachments
// ==========================================

function toggleAriseAttachMenu() {
    const menu = document.getElementById('ariseAttachMenu');
    menu?.classList.toggle('active');
}

function handleAriseFileAttach() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx,.txt';

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            await addAriseAttachment(file);
        }
    };

    input.click();
    document.getElementById('ariseAttachMenu')?.classList.remove('active');
}

async function addAriseAttachment(file) {
    const preview = {
        id: 'attach-' + Date.now(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
    };

    // For images, create thumbnail
    if (file.type.startsWith('image/')) {
        preview.thumbnail = await createImageThumbnail(file);
    }

    ariseState.attachedFiles.push(preview);
    renderAriseAttachments();
}

function createImageThumbnail(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function removeAriseAttachment(attachId) {
    ariseState.attachedFiles = ariseState.attachedFiles.filter(a => a.id !== attachId);
    renderAriseAttachments();
}

function renderAriseAttachments() {
    const container = document.getElementById('ariseAttachments');
    if (!container) return;

    if (ariseState.attachedFiles.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = ariseState.attachedFiles.map(attach => `
        <div class="arise-attachment-item">
            ${attach.thumbnail
            ? `<img src="${attach.thumbnail}" alt="${attach.name}">`
            : `<div class="file-icon">📄</div>`
        }
            <span class="attachment-name">${attach.name}</span>
            <button onclick="removeAriseAttachment('${attach.id}')" class="remove-attachment">×</button>
        </div>
    `).join('');
}

// ==========================================
// Send Message
// ==========================================

async function sendToAriseEnhanced() {
    const input = document.getElementById('ariseInput');
    const content = input?.value?.trim();

    if (!content && ariseState.attachedFiles.length === 0) return;

    // Disable input during send
    input.value = '';
    input.disabled = true;
    ariseState.isLoading = true;

    // Create new conversation if needed
    if (!ariseState.currentConversation) {
        newAriseChat();
    }

    // Add user message
    const userMessage = {
        role: 'user',
        content: content,
        attachments: ariseState.attachedFiles.map(a => ({ name: a.name, type: a.type })),
        timestamp: new Date().toISOString()
    };
    ariseState.currentConversation.messages.push(userMessage);

    // Clear attachments
    ariseState.attachedFiles = [];
    renderAriseAttachments();

    // Render chat with loading
    renderAriseChat();
    appendAriseLoading();

    try {
        const response = await fetch(`${API_URL}/api/arise/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                model: ariseState.selectedModel,
                conversation_history: ariseState.currentConversation.messages.slice(-10)
            })
        });

        removeAriseLoading();

        if (response.ok) {
            const data = await response.json();

            // Add AI response
            ariseState.currentConversation.messages.push({
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
            });

            // Update conversation title if first message
            if (ariseState.currentConversation.messages.length === 2) {
                ariseState.currentConversation.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
            }

            // Save conversation
            saveCurrentConversation();
            renderAriseChat();
            renderAriseSidebar();
        } else {
            throw new Error('Failed to get response');
        }
    } catch (error) {
        removeAriseLoading();
        ariseState.currentConversation.messages.push({
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date().toISOString()
        });
        renderAriseChat();
    }

    input.disabled = false;
    input.focus();
    ariseState.isLoading = false;
}

function appendAriseLoading() {
    const container = document.getElementById('ariseMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'ariseLoading';
    loadingDiv.className = 'arise-message assistant';
    loadingDiv.innerHTML = `
        <div class="arise-message-avatar">
            <svg class="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
        </div>
        <div class="arise-message-content">
            <div class="loader-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    container?.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
}

function removeAriseLoading() {
    document.getElementById('ariseLoading')?.remove();
}

// ==========================================
// Storage Functions - Database API
// ==========================================

async function loadAriseConversations() {
    try {
        const response = await fetch(`${API_URL}/api/arise/conversations`, {
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            }
        });

        if (response.ok) {
            const conversations = await response.json();
            // Map backend format to frontend format
            ariseState.conversations = conversations.map(c => ({
                id: c.id,
                title: c.title || 'New Chat',
                model: c.model || 'gemini-pro',
                messages: c.messages || [],
                createdAt: c.created_at,
                updatedAt: c.updated_at
            }));
        }
    } catch (e) {
        console.error('Error loading conversations from DB:', e);
        // Fallback to localStorage
        try {
            const saved = localStorage.getItem('ariseConversations');
            if (saved) {
                ariseState.conversations = JSON.parse(saved);
            }
        } catch (e2) {
            console.error('Error loading from localStorage:', e2);
        }
    }
    renderAriseSidebar();
}

async function saveAriseConversations() {
    // This is now handled per-conversation via API
    // Keep localStorage as backup
    try {
        localStorage.setItem('ariseConversations', JSON.stringify(ariseState.conversations));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

async function saveCurrentConversation() {
    if (!ariseState.currentConversation) return;

    ariseState.currentConversation.updatedAt = new Date().toISOString();

    const isNew = ariseState.currentConversation.id.startsWith('temp-');

    try {
        if (isNew) {
            // Create new conversation in database
            const response = await fetch(`${API_URL}/api/arise/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AppState.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: ariseState.currentConversation.title,
                    model: ariseState.currentConversation.model
                })
            });

            if (response.ok) {
                const newConv = await response.json();
                ariseState.currentConversation.id = newConv.id;
                ariseState.conversations.unshift(ariseState.currentConversation);

                // Save messages to database
                await updateConversationInDB(newConv.id, ariseState.currentConversation.messages);
            }
        } else {
            // Update existing conversation
            const index = ariseState.conversations.findIndex(c => c.id === ariseState.currentConversation.id);
            if (index >= 0) {
                ariseState.conversations[index] = ariseState.currentConversation;
            }

            // Update in database
            await updateConversationInDB(ariseState.currentConversation.id, ariseState.currentConversation.messages);
        }
    } catch (e) {
        console.error('Error saving conversation to DB:', e);
    }

    // Backup to localStorage
    saveAriseConversations();
}

async function updateConversationInDB(convId, messages) {
    try {
        await fetch(`${API_URL}/api/arise/conversations/${convId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: ariseState.currentConversation?.title,
                messages: messages
            })
        });
    } catch (e) {
        console.error('Error updating conversation in DB:', e);
    }
}

function loadAriseSettings() {
    try {
        const saved = localStorage.getItem('ariseSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            ariseState.selectedModel = settings.selectedModel || 'gemini-pro';
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
    renderModelSelector();
}

function saveAriseSettings() {
    try {
        localStorage.setItem('ariseSettings', JSON.stringify({
            selectedModel: ariseState.selectedModel
        }));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

function loadAriseProjects() {
    try {
        const saved = localStorage.getItem('ariseProjects');
        if (saved) {
            ariseState.projects = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading projects:', e);
    }
}

// ==========================================
// Projects
// ==========================================

function showNewProjectModal() {
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.id = 'newProjectModal';
    modal.innerHTML = `
        <div class="new-group-modal" style="max-width: 400px;">
            <div class="new-group-header">
                <button class="text-white" onclick="closeProjectModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <h3 class="text-lg font-semibold text-white">New Project</h3>
            </div>
            <div class="p-4">
                <input type="text" id="projectNameInput" placeholder="Project name" 
                       class="input-field w-full px-4 py-3 rounded-lg mb-4">
                <textarea id="projectDescInput" placeholder="Description (optional)" 
                          class="input-field w-full px-4 py-3 rounded-lg mb-4" rows="3"></textarea>
                <button class="btn-primary w-full py-3 rounded-lg" onclick="createProject()">
                    Create Project
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeProjectModal() {
    document.getElementById('newProjectModal')?.remove();
}

function createProject() {
    const name = document.getElementById('projectNameInput')?.value?.trim();
    const desc = document.getElementById('projectDescInput')?.value?.trim();

    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }

    const project = {
        id: 'proj-' + Date.now(),
        name: name,
        description: desc,
        members: [AppState.user.id],
        conversations: [],
        createdAt: new Date().toISOString()
    };

    ariseState.projects.push(project);
    localStorage.setItem('ariseProjects', JSON.stringify(ariseState.projects));

    closeProjectModal();
    renderAriseProjects();
    showToast('Project created!', 'success');
}

function renderAriseProjects() {
    const container = document.getElementById('ariseProjectsList');
    if (!container) return;

    container.innerHTML = ariseState.projects.map(proj => `
        <div class="arise-project-item" onclick="openProject('${proj.id}')">
            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
            <span>${escapeHtml(proj.name)}</span>
        </div>
    `).join('');
}

function openProject(projectId) {
    showToast('Opening project...', 'info');
    // Project view implementation
}

// ==========================================
// Utility
// ==========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// Global Exports
// ==========================================

window.ariseState = ariseState;
window.toggleAriseSidebar = toggleAriseSidebar;
window.newAriseChat = newAriseChat;
window.openAriseConversation = openAriseConversation;
window.deleteAriseConversation = deleteAriseConversation;
window.renameAriseConversation = renameAriseConversation;
window.searchAriseConversations = searchAriseConversations;
window.toggleModelSelector = toggleModelSelector;
window.selectAriseModel = selectAriseModel;
window.toggleAriseAttachMenu = toggleAriseAttachMenu;
window.handleAriseFileAttach = handleAriseFileAttach;
window.removeAriseAttachment = removeAriseAttachment;
window.sendToAriseEnhanced = sendToAriseEnhanced;
window.sendAriseSuggestion = sendAriseSuggestion;
window.showNewProjectModal = showNewProjectModal;
window.closeProjectModal = closeProjectModal;
window.createProject = createProject;
window.openProject = openProject;
window.renderAriseChat = renderAriseChat;
window.renderAriseSidebar = renderAriseSidebar;
window.renderAriseProjects = renderAriseProjects;
window.renderModelSelector = renderModelSelector;
