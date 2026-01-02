import { useChatStore } from '../../stores/chatStore';
import type { NavView } from '../../types';

export function NavRail() {
    const { currentView, setCurrentView } = useChatStore();

    const handleNavClick = (view: NavView) => {
        setCurrentView(view);
    };

    return (
        <nav className="nav-rail" id="navRail">
            {/* Top Navigation Items */}
            <div className="nav-rail-top">
                {/* Menu Toggle */}
                <button className="nav-rail-btn" id="navMenuBtn" title="Menu">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Chats */}
                <button
                    className={`nav-rail-btn ${currentView === 'chats' ? 'active' : ''}`}
                    onClick={() => handleNavClick('chats')}
                    title="Chats"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="nav-badge" id="chatsBadge"></span>
                </button>

                {/* Calls */}
                <button
                    className={`nav-rail-btn ${currentView === 'calls' ? 'active' : ''}`}
                    onClick={() => handleNavClick('calls')}
                    title="Calls"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </button>

                {/* Status */}
                <button
                    className={`nav-rail-btn ${currentView === 'status' ? 'active' : ''}`}
                    onClick={() => handleNavClick('status')}
                    title="Status"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>

                {/* Groups */}
                <button
                    className={`nav-rail-btn ${currentView === 'groups' ? 'active' : ''}`}
                    onClick={() => handleNavClick('groups')}
                    title="Groups"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </button>
            </div>

            {/* Bottom Navigation Items */}
            <div className="nav-rail-bottom">
                {/* Starred */}
                <button
                    className={`nav-rail-btn ${currentView === 'starred' ? 'active' : ''}`}
                    onClick={() => handleNavClick('starred')}
                    title="Starred Messages"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </button>

                {/* Archived */}
                <button
                    className={`nav-rail-btn ${currentView === 'archived' ? 'active' : ''}`}
                    onClick={() => handleNavClick('archived')}
                    title="Archived Chats"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                </button>

                {/* Settings */}
                <button
                    className={`nav-rail-btn ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => handleNavClick('settings')}
                    title="Settings"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                {/* Profile */}
                <button
                    className={`nav-rail-btn profile-btn ${currentView === 'profile' ? 'active' : ''}`}
                    onClick={() => handleNavClick('profile')}
                    title="Profile"
                >
                    <ProfileAvatar />
                </button>
            </div>
        </nav>
    );
}

function ProfileAvatar() {
    const username = localStorage.getItem('username') || 'U';
    return (
        <div className="nav-profile-avatar">
            <span>{username.charAt(0).toUpperCase()}</span>
        </div>
    );
}
