/**
 * NexusChat - File Handler
 */

function initFileHandler() {
    document.getElementById('attachBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
}

function getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📎';
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AppState.token}` },
        body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
}

window.initFileHandler = initFileHandler;
window.uploadFile = uploadFile;
window.formatFileSize = formatFileSize;
window.getFileIcon = getFileIcon;
