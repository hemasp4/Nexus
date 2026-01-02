import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import '../styles/style.css';
import '../styles/animations.css';

export function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, register, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        if (isLogin) {
            const success = await login(email, password);
            if (success) navigate('/chat');
        } else {
            const success = await register(email, username, password);
            if (success) {
                setIsLogin(true);
                setPassword('');
            }
        }
    };

    const switchTab = (toLogin: boolean) => {
        setIsLogin(toLogin);
        clearError();
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="animated-bg"></div>

            {/* Main Container */}
            <div className="login-container">
                {/* Logo Section */}
                <div className="logo-section">
                    <div className="logo-box">
                        <svg className="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h1 className="logo-title">NexusChat</h1>
                    <p className="logo-subtitle">Connect, Collaborate, Create</p>
                </div>

                {/* Auth Card */}
                <div className="auth-card">
                    {/* Tab Switcher */}
                    <div className="tab-switcher">
                        <button
                            className={`tab-btn ${isLogin ? 'active' : ''}`}
                            onClick={() => switchTab(true)}
                        >
                            Login
                        </button>
                        <button
                            className={`tab-btn ${!isLogin ? 'active' : ''}`}
                            onClick={() => switchTab(false)}
                        >
                            Register
                        </button>
                    </div>

                    {/* Login/Register Form */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Username Field (Register only) */}
                        {!isLogin && (
                            <div className="input-group">
                                <label className="input-label">Username</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        className="input-field with-icon"
                                        placeholder="Choose a username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        minLength={3}
                                        maxLength={30}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <div className="input-wrapper">
                                <span className="input-icon">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    className="input-field with-icon"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field with-icon with-toggle"
                                    placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="auth-error">{String(error)}</div>
                        )}

                        {/* Submit Button */}
                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            <span>{isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</span>
                            {!isLoading && (
                                <svg className="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="powered-by">
                    Powered by <span className="arise-text">Arise AI</span> 🤖
                </p>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <p>Please wait...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
