import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { Contact } from '../../types';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
    const { searchUsers, addContact, loadContacts } = useChatStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Contact[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                const results = await searchUsers(searchQuery);
                setSearchResults(results);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    const handleAddContact = async (contactId: string) => {
        setAddingIds(prev => new Set(prev).add(contactId));

        const success = await addContact(contactId);

        if (success) {
            // Remove from search results
            setSearchResults(prev => prev.filter(c => c.contact_id !== contactId));
            // Reload contacts
            await loadContacts();
        }

        setAddingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(contactId);
            return newSet;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container add-contact-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h3>Add New Contact</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search Input */}
                <div className="modal-search">
                    <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="modal-search-input"
                        autoFocus
                    />
                </div>

                {/* Search Results */}
                <div className="search-results-container">
                    {isSearching ? (
                        <div className="search-loading">
                            <div className="loading-spinner small"></div>
                            <p>Searching...</p>
                        </div>
                    ) : searchQuery.trim().length < 2 ? (
                        <div className="search-hint">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p>Enter at least 2 characters to search</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="no-results">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No users found</p>
                            <span>Try a different search term</span>
                        </div>
                    ) : (
                        <div className="search-results-list">
                            {searchResults.map((user) => (
                                <SearchResultItem
                                    key={user.id}
                                    user={user}
                                    isAdding={addingIds.has(user.contact_id)}
                                    onAdd={() => handleAddContact(user.contact_id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SearchResultItem({
    user,
    isAdding,
    onAdd,
}: {
    user: Contact;
    isAdding: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="search-result-item">
            <div className="user-avatar">
                {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                ) : (
                    <div className="avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className={`status-dot ${user.status === 'online' ? 'online' : 'offline'}`} />
            </div>
            <div className="user-info">
                <span className="user-name">{user.username}</span>
                <span className="user-status">{user.status || 'offline'}</span>
            </div>
            <button
                className="add-contact-btn"
                onClick={onAdd}
                disabled={isAdding}
            >
                {isAdding ? (
                    <div className="loading-spinner tiny"></div>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                    </>
                )}
            </button>
        </div>
    );
}
