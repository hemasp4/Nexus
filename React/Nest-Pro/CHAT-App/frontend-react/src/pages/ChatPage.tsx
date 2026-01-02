import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { NavRail } from '../components/layout/NavRail';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatArea } from '../components/layout/ChatArea';
import '../styles/style.css';
import '../styles/animations.css';

export function ChatPage() {
    const { isAuthenticated } = useAuthStore();
    const { loadContacts, loadRooms } = useChatStore();

    useEffect(() => {
        if (isAuthenticated) {
            loadContacts();
            loadRooms();
        }
    }, [isAuthenticated, loadContacts, loadRooms]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="chat-container">
            {/* Left Navigation Rail */}
            <NavRail />

            {/* Sidebar with contacts/groups */}
            <Sidebar />

            {/* Main Chat Area */}
            <ChatArea />
        </div>
    );
}
