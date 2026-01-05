import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useCallStore } from './stores/callStore';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { useWebSocket } from './hooks/useWebSocket';
import { CallModal } from './components/call/CallModal';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { GroupCallModal } from './components/call/GroupCallModal';
import { PopOutChatManager } from './components/chat/PopOutChat';
import './styles/style.css';
import './styles/animations.css';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <AppContent isAuthenticated={isAuthenticated} />
    </BrowserRouter>
  );
}

function AppContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Initialize WebSocket for authenticated users
  const { sendMessage } = useWebSocket();
  const { setSendWebSocket } = useCallStore();

  // Connect WebSocket sendMessage to callStore
  useEffect(() => {
    if (sendMessage) {
      setSendWebSocket(sendMessage);
    }
  }, [sendMessage, setSendWebSocket]);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />}
        />
        <Route
          path="/chat"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />}
        />
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      {/* Global Call Modals & Pop-out Chats */}
      {isAuthenticated && (
        <>
          <CallModal />
          <IncomingCallModal />
          <GroupCallModal sendMessage={sendMessage} />
          <PopOutChatManager />
        </>
      )}
    </>
  );
}

export default App;
