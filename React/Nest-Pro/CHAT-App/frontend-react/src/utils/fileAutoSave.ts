/**
 * File Auto-Save Utility
 * Handles automatic saving of files to NexusChat folders
 */

const API_URL = 'http://127.0.0.1:8000';

// Size limit for auto-save (50MB)
const AUTO_SAVE_SIZE_LIMIT = 50 * 1024 * 1024;

/**
 * Check if auto-save is enabled for a contact
 */
export function isAutoSaveEnabled(contactId?: string): boolean {
    // Check per-contact setting first
    if (contactId) {
        const contactSettings = localStorage.getItem(`contact_settings_${contactId}`);
        if (contactSettings) {
            const parsed = JSON.parse(contactSettings);
            if (parsed.autoSaveFiles !== undefined) {
                return parsed.autoSaveFiles;
            }
        }
    }

    // Fall back to global setting
    const globalSetting = localStorage.getItem('nexuschat_auto_save');
    return globalSetting === 'true';
}

/**
 * Set global auto-save setting
 */
export function setGlobalAutoSave(enabled: boolean): void {
    localStorage.setItem('nexuschat_auto_save', enabled.toString());
}

/**
 * Get global auto-save setting
 */
export function getGlobalAutoSave(): boolean {
    return localStorage.getItem('nexuschat_auto_save') === 'true';
}

/**
 * Determine file type from MIME type or filename
 */
export function getFileType(mimeType?: string, filename?: string): 'image' | 'video' | 'file' {
    if (mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
    }

    if (filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'];

        if (imageExts.includes(ext || '')) return 'image';
        if (videoExts.includes(ext || '')) return 'video';
    }

    return 'file';
}

/**
 * Check if file size is within auto-save limit
 */
export function canAutoSave(fileSize: number): boolean {
    return fileSize <= AUTO_SAVE_SIZE_LIMIT;
}

/**
 * Auto-save a file to NexusChat folders
 */
export async function autoSaveFile(
    fileId: string,
    mimeType?: string,
    filename?: string,
    contactId?: string
): Promise<{ success: boolean; message: string; path?: string }> {
    // Check if auto-save is enabled
    if (!isAutoSaveEnabled(contactId)) {
        return { success: false, message: 'Auto-save is disabled' };
    }

    try {
        const fileType = getFileType(mimeType, filename);

        const response = await fetch(`${API_URL}/api/files/auto-save/${fileId}?file_type=${fileType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Auto-save failed:', error);
        return { success: false, message: 'Auto-save failed' };
    }
}

/**
 * Handle file reception - auto-save if enabled and size allows
 */
export async function handleReceivedFile(
    fileId: string,
    fileSize: number,
    mimeType?: string,
    filename?: string,
    contactId?: string
): Promise<{ autoSaved: boolean; requiresDownload: boolean; message: string }> {
    // File too large for auto-save
    if (!canAutoSave(fileSize)) {
        return {
            autoSaved: false,
            requiresDownload: true,
            message: 'File is too large for auto-save. Download required.'
        };
    }

    // Try auto-save
    const result = await autoSaveFile(fileId, mimeType, filename, contactId);

    return {
        autoSaved: result.success,
        requiresDownload: !result.success,
        message: result.message
    };
}

/**
 * Initialize NexusChat folders on app start
 */
export async function initializeNexusChatFolders(): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/files/init-folders`, {
            method: 'POST'
        });

        const result = await response.json();
        console.log('NexusChat folders initialized:', result);
        return result.success;
    } catch (error) {
        console.error('Failed to initialize NexusChat folders:', error);
        return false;
    }
}

/**
 * Download large file with File System Access API or fallback
 */
export async function downloadLargeFile(
    fileId: string,
    filename: string
): Promise<boolean> {
    try {
        // Try File System Access API first
        if ('showSaveFilePicker' in window) {
            const response = await fetch(`${API_URL}/api/files/${fileId}`);
            const blob = await response.blob();

            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            return true;
        }

        // Fallback: download link
        const link = document.createElement('a');
        link.href = `${API_URL}/api/files/${fileId}`;
        link.download = filename;
        link.click();

        return true;
    } catch (error) {
        console.error('Download failed:', error);
        return false;
    }
}
