import { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/config';

const API_URL = 'http://127.0.0.1:8000';

// SVG Icons matching the original design
const Icons = {
    general: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    account: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    chats: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
    videoVoice: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    notifications: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>,
    personalization: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>,
    storage: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
    shortcuts: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6ZM7.5 6h.008v.008H7.5V6Zm2.25 0h.008v.008H9.75V6Z" /></svg>,
    help: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>,
    logout: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>,
    close: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6l12 12" /></svg>,
    chevron: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>,
    key: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>,
    shield: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
    block: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
};

export function SettingsPanel() {
    const {
        settings,
        currentSection,
        setCurrentSection,
        loadSettings,
        setTheme,
        setFontSize,
        updateSettings,
        blockedUsers,
        loadBlockedUsers,
        unblockUser,
        changePassword,
        clearCache
    } = useSettingsStore();
    const { user, logout, updateUser } = useAuthStore();
    const [aboutText, setAboutText] = useState(user?.about || "Hey there! I'm using NexusChat");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadSettings();
        loadBlockedUsers();
    }, [loadSettings, loadBlockedUsers]);

    const sections = [
        { id: 'general', label: 'General', icon: Icons.general },
        { id: 'account', label: 'Account', icon: Icons.account },
        { id: 'chats', label: 'Chats', icon: Icons.chats },
        { id: 'videovoice', label: 'Video & Voice', icon: Icons.videoVoice },
        { id: 'notifications', label: 'Notifications', icon: Icons.notifications },
        { id: 'personalization', label: 'Personalization', icon: Icons.personalization },
        { id: 'storage', label: 'Storage', icon: Icons.storage },
        { id: 'shortcuts', label: 'Shortcuts', icon: Icons.shortcuts },
        { id: 'help', label: 'Help', icon: Icons.help },
    ] as const;

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/api/files/upload', formData);
            const fileId = uploadRes.data.file_id;
            await api.put('/api/users/me', { avatar: fileId });
            updateUser({ avatar: fileId });
        } catch (error) {
            console.error('Failed to update avatar:', error);
        }
    };

    const handleAboutSave = async () => {
        try {
            await api.put('/api/users/me', { about: aboutText });
            updateUser({ about: aboutText });
        } catch (error) {
            console.error('Failed to update about:', error);
        }
    };

    // CSS Styles
    const styles = {
        panel: { display: 'flex', height: '100%', width: '100%', background: '#0f0f17' } as React.CSSProperties,
        sidebar: { width: '280px', minWidth: '280px', background: '#12121a', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
        header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
        closeBtn: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
        headerTitle: { fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 } as React.CSSProperties,
        profile: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
        avatar: { width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', fontWeight: 600, cursor: 'pointer', overflow: 'hidden' } as React.CSSProperties,
        nav: { flex: 1, padding: '12px', overflow: 'auto' } as React.CSSProperties,
        navItem: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#a1a1aa', fontSize: '14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', marginBottom: '4px', transition: 'all 0.15s' }) as React.CSSProperties,
        logoutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '12px', padding: '12px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#fff', fontSize: '14px', fontWeight: 500, borderRadius: '10px', cursor: 'pointer' } as React.CSSProperties,
        content: { flex: 1, padding: '0', overflow: 'auto', background: '#0f0f17' } as React.CSSProperties,
        section: { padding: '24px 32px', maxWidth: '700px' } as React.CSSProperties,
        sectionTitle: { fontSize: '12px', fontWeight: 600, color: '#6366f1', marginBottom: '16px', letterSpacing: '0.5px' } as React.CSSProperties,
        settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#1a1a24', borderRadius: '12px', marginBottom: '8px' } as React.CSSProperties,
        settingInfo: { flex: 1 } as React.CSSProperties,
        settingLabel: { fontSize: '15px', color: '#fff', fontWeight: 500 } as React.CSSProperties,
        settingDesc: { fontSize: '13px', color: '#71717a', marginTop: '2px' } as React.CSSProperties,
        select: { padding: '10px 16px', paddingRight: '36px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' } as React.CSSProperties,
        toggle: (on: boolean) => ({ width: '48px', height: '28px', borderRadius: '14px', background: on ? '#6366f1' : '#333', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }) as React.CSSProperties,
        toggleKnob: (on: boolean) => ({ position: 'absolute', top: '4px', left: on ? '24px' : '4px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }) as React.CSSProperties,
        actionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: '#1a1a24', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '15px', cursor: 'pointer', marginBottom: '8px' } as React.CSSProperties,
        actionBtnInner: { display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
    };

    const handleSettingChange = async (key: string, value: string | boolean) => {
        await updateSettings({ [key]: value });
    };

    const renderContent = () => {
        switch (currentSection) {
            case 'general':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>LANGUAGE</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>App Language</div>
                                <div style={styles.settingDesc}>Change the display language</div>
                            </div>
                            <select style={styles.select} value={settings.language || 'en'} onChange={(e) => handleSettingChange('language', e.target.value)}>
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                            </select>
                        </div>

                        <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>STARTUP</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Start minimized</div>
                                <div style={styles.settingDesc}>App starts in system tray</div>
                            </div>
                            <button style={styles.toggle(settings.start_minimized || false)} onClick={() => handleSettingChange('start_minimized', !settings.start_minimized)}>
                                <span style={styles.toggleKnob(settings.start_minimized || false)} />
                            </button>
                        </div>
                    </div>
                );

            case 'account':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>PRIVACY</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Profile photo</div>
                                <div style={styles.settingDesc}>Who can see your profile photo</div>
                            </div>
                            <select style={styles.select} value={settings.profile_photo_visibility || 'everyone'} onChange={(e) => handleSettingChange('profile_photo_visibility', e.target.value)}>
                                <option value="everyone">Everyone</option>
                                <option value="contacts">My contacts</option>
                                <option value="nobody">Nobody</option>
                            </select>
                        </div>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>About</div>
                                <div style={styles.settingDesc}>Who can see your about</div>
                            </div>
                            <select style={styles.select} value={settings.about_visibility || 'everyone'} onChange={(e) => handleSettingChange('about_visibility', e.target.value)}>
                                <option value="everyone">Everyone</option>
                                <option value="contacts">My contacts</option>
                                <option value="nobody">Nobody</option>
                            </select>
                        </div>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Read receipts</div>
                                <div style={styles.settingDesc}>Others see when you read messages</div>
                            </div>
                            <button style={styles.toggle(settings.read_receipts !== false)} onClick={() => handleSettingChange('read_receipts', !settings.read_receipts)}>
                                <span style={styles.toggleKnob(settings.read_receipts !== false)} />
                            </button>
                        </div>

                        <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>SECURITY</h3>
                        <button style={styles.actionBtn} onClick={async () => {
                            const old = prompt('Enter current password:');
                            if (!old) return;
                            const newP = prompt('Enter new password (min 6 characters):');
                            if (!newP || newP.length < 6) { alert('Password must be at least 6 characters'); return; }
                            const confirm = prompt('Confirm new password:');
                            if (newP !== confirm) { alert('Passwords do not match'); return; }
                            const success = await changePassword(old, newP);
                            alert(success ? 'Password changed successfully!' : 'Failed to change password');
                        }}>
                            <div style={styles.actionBtnInner}>{Icons.key}<span>Change password</span></div>
                            <div style={{ color: '#71717a' }}>Update your account password</div>
                            {Icons.chevron}
                        </button>
                        <button style={styles.actionBtn}>
                            <div style={styles.actionBtnInner}>{Icons.shield}<span>Two-step verification</span></div>
                            <div style={{ color: '#71717a' }}>Add an extra layer of security</div>
                            {Icons.chevron}
                        </button>

                        <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>BLOCKED CONTACTS</h3>
                        <button style={styles.actionBtn}>
                            <div style={styles.actionBtnInner}>{Icons.block}<span>Manage blocked contacts</span></div>
                            <div style={{ color: '#71717a' }}>{blockedUsers.length} blocked contacts</div>
                            {Icons.chevron}
                        </button>
                    </div>
                );

            case 'chats':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>MESSAGE INPUT</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Enter is send</div>
                                <div style={styles.settingDesc}>Press Enter to send messages</div>
                            </div>
                            <button style={styles.toggle(settings.enter_is_send !== false)} onClick={() => handleSettingChange('enter_is_send', !settings.enter_is_send)}>
                                <span style={styles.toggleKnob(settings.enter_is_send !== false)} />
                            </button>
                        </div>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Media auto-download</div>
                                <div style={styles.settingDesc}>Automatically download media files</div>
                            </div>
                            <select style={styles.select} value={settings.media_auto_download || 'wifi'} onChange={(e) => handleSettingChange('media_auto_download', e.target.value)}>
                                <option value="always">Always</option>
                                <option value="wifi">WiFi only</option>
                                <option value="never">Never</option>
                            </select>
                        </div>
                    </div>
                );

            case 'videovoice':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>AUDIO</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Microphone</div>
                                <div style={styles.settingDesc}>Select input device</div>
                            </div>
                            <select style={styles.select}><option>Default Microphone</option></select>
                        </div>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Speaker</div>
                                <div style={styles.settingDesc}>Select output device</div>
                            </div>
                            <select style={styles.select}><option>Default Speaker</option></select>
                        </div>

                        <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>VIDEO</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Camera</div>
                                <div style={styles.settingDesc}>Select video input</div>
                            </div>
                            <select style={styles.select}><option>Default Camera</option></select>
                        </div>
                    </div>
                );

            case 'notifications':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>MESSAGES</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Message notifications</div>
                                <div style={styles.settingDesc}>Show notifications for new messages</div>
                            </div>
                            <button style={styles.toggle(settings.notifications !== false)} onClick={() => handleSettingChange('notifications', !settings.notifications)}>
                                <span style={styles.toggleKnob(settings.notifications !== false)} />
                            </button>
                        </div>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Message sounds</div>
                                <div style={styles.settingDesc}>Play sounds for notifications</div>
                            </div>
                            <button style={styles.toggle(settings.message_sounds !== false)} onClick={() => handleSettingChange('message_sounds', !settings.message_sounds)}>
                                <span style={styles.toggleKnob(settings.message_sounds !== false)} />
                            </button>
                        </div>

                        <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>GROUPS</h3>
                        <div style={styles.settingRow}>
                            <div style={styles.settingInfo}>
                                <div style={styles.settingLabel}>Group notifications</div>
                                <div style={styles.settingDesc}>Show notifications for group messages</div>
                            </div>
                            <button style={styles.toggle(settings.notification_groups !== false)} onClick={() => handleSettingChange('notification_groups', !settings.notification_groups)}>
                                <span style={styles.toggleKnob(settings.notification_groups !== false)} />
                            </button>
                        </div>
                    </div>
                );

            case 'personalization':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>THEME</h3>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            {(['dark', 'light', 'system'] as const).map((t) => (
                                <button key={t} onClick={() => setTheme(t)} style={{ flex: 1, padding: '16px', background: settings.theme === t ? '#6366f1' : '#1a1a24', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                                    {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 System'}
                                </button>
                            ))}
                        </div>

                        <h3 style={styles.sectionTitle}>FONT SIZE</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {(['small', 'medium', 'large'] as const).map((s) => (
                                <button key={s} onClick={() => setFontSize(s)} style={{ flex: 1, padding: '16px', background: settings.font_size === s ? '#6366f1' : '#1a1a24', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: s === 'small' ? '13px' : s === 'medium' ? '15px' : '17px', fontWeight: 500 }}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'storage':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>DATA MANAGEMENT</h3>
                        <button style={{ ...styles.actionBtn, color: '#ef4444' }} onClick={() => { if (confirm('Clear all cached data?')) { clearCache(); alert('Cache cleared!'); } }}>
                            <div style={styles.actionBtnInner}>🗑️ Clear cache</div>
                            <div style={{ color: '#71717a' }}>Free up storage space</div>
                            {Icons.chevron}
                        </button>
                    </div>
                );

            case 'shortcuts':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>KEYBOARD SHORTCUTS</h3>
                        {[
                            { keys: 'Ctrl + ,', action: 'Open Settings' },
                            { keys: 'Ctrl + N', action: 'New Chat' },
                            { keys: 'Ctrl + F', action: 'Search' },
                            { keys: 'Escape', action: 'Close Modal' },
                        ].map((s, i) => (
                            <div key={i} style={{ ...styles.settingRow, justifyContent: 'space-between' }}>
                                <span style={{ color: '#a1a1aa' }}>{s.action}</span>
                                <kbd style={{ background: '#1a1a24', padding: '8px 14px', borderRadius: '8px', border: '1px solid #333', fontFamily: 'monospace', fontSize: '13px', color: '#fff' }}>{s.keys}</kbd>
                            </div>
                        ))}
                    </div>
                );

            case 'help':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>SUPPORT</h3>
                        <button style={styles.actionBtn}>
                            <div style={styles.actionBtnInner}>❓ FAQ</div>
                            {Icons.chevron}
                        </button>
                        <button style={styles.actionBtn}>
                            <div style={styles.actionBtnInner}>📧 Contact Support</div>
                            {Icons.chevron}
                        </button>
                        <button style={styles.actionBtn}>
                            <div style={styles.actionBtnInner}>ℹ️ About NexusChat</div>
                            {Icons.chevron}
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={styles.panel}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.header}>
                    <button style={styles.closeBtn}>{Icons.close}</button>
                    <h2 style={styles.headerTitle}>Settings</h2>
                </div>

                <div style={styles.profile}>
                    <div style={styles.avatar} onClick={() => avatarInputRef.current?.click()}>
                        {user?.avatar ? (
                            <img src={`${API_URL}/api/files/${user.avatar}`} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user?.username?.charAt(0)?.toUpperCase() || 'U'
                        )}
                    </div>
                    <input type="file" ref={avatarInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
                    <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{user?.username || 'Username'}</div>
                        <div style={{ fontSize: '13px', color: '#71717a' }}>{user?.about || "Hey there! I'm using Ne..."}</div>
                    </div>
                </div>

                <nav style={styles.nav}>
                    {sections.map((section) => (
                        <button key={section.id} style={styles.navItem(currentSection === section.id)} onClick={() => setCurrentSection(section.id as typeof currentSection)}>
                            {section.icon}
                            <span>{section.label}</span>
                        </button>
                    ))}
                </nav>

                <button style={styles.logoutBtn} onClick={logout}>
                    {Icons.logout}
                    <span>Logout</span>
                </button>
            </div>

            {/* Content */}
            <div style={styles.content}>
                {renderContent()}
            </div>
        </div>
    );
}
