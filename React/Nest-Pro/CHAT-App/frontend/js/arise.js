/**
 * NexusChat - Arise AI Assistant
 */

const ariseInput = document.getElementById('ariseInput');
const ariseSendBtn = document.getElementById('ariseSendBtn');
const ariseMessages = document.getElementById('ariseMessages');
const arisePanel = document.getElementById('arisePanel');
const closeAriseBtn = document.getElementById('closeAriseBtn');

let ariseHistory = [];

document.addEventListener('DOMContentLoaded', initArise);

function initArise() {
    ariseInput?.addEventListener('input', () => {
        ariseSendBtn.disabled = !ariseInput.value.trim();
        ariseInput.style.height = 'auto';
        ariseInput.style.height = Math.min(ariseInput.scrollHeight, 120) + 'px';
    });

    ariseInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendToArise();
        }
    });

    ariseSendBtn?.addEventListener('click', sendToArise);
    closeAriseBtn?.addEventListener('click', () => arisePanel?.classList.add('hidden'));
}

async function sendToArise() {
    const content = ariseInput?.value.trim();
    if (!content) return;

    appendAriseMessage(content, 'user');
    ariseInput.value = '';
    ariseSendBtn.disabled = true;

    ariseHistory.push({ role: 'user', content });

    appendAriseMessage('<div class="loader-dots"><span></span><span></span><span></span></div>', 'ai', true);

    try {
        const response = await fetch(`${API_URL}/api/arise/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                conversation_history: ariseHistory.slice(-10)
            })
        });

        removeLoadingMessage();

        if (response.ok) {
            const data = await response.json();
            appendAriseMessage(data.response, 'ai');
            ariseHistory.push({ role: 'assistant', content: data.response });
        } else {
            appendAriseMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    } catch (error) {
        removeLoadingMessage();
        appendAriseMessage('Connection error. Please check your network.', 'ai');
    }
}

function appendAriseMessage(content, type, isLoading = false) {
    const div = document.createElement('div');
    div.className = `arise-message ${type}`;
    if (isLoading) div.id = 'ariseLoading';

    div.innerHTML = `<div class="arise-message-content">${content}</div>`;
    ariseMessages?.appendChild(div);
    ariseMessages.scrollTop = ariseMessages.scrollHeight;
}

function removeLoadingMessage() {
    document.getElementById('ariseLoading')?.remove();
}

window.sendToArise = sendToArise;
