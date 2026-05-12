import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

export default function Sidebar({ onSelectContact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const searchTimeout = useRef(null);

  const { contacts, requests, onlineUsers, loadContacts, loadRequests, acceptRequest, declineRequest, addRequest, activeContact } = useChatStore();
  const { user, logout } = useAuthStore();
  const socket = getSocket();

  useEffect(() => {
    loadContacts();
    loadRequests();
  }, []);

  useEffect(() => {
    socket.on('request:received', (req) => {
      addRequest(req);
      toast.custom(() => (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-sm text-white shadow-xl">
          <span className="text-lg">👋</span>
          <span><b>{req.fromUser?.username}</b> wants to chat with you</span>
        </div>
      ));
    });
    socket.on('request:accepted', () => {
      loadContacts();
    });
    return () => { socket.off('request:received'); socket.off('request:accepted'); };
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
      } catch {}
      setSearching(false);
    }, 300);
  };

  const sendRequest = async (toUserId) => {
    try {
      const res = await api.post('/users/request', { toUserId });
      socket.emit('request:send', { ...res.data.request, toUserId });
      setSearchResults(prev => prev.map(u => u.id === toUserId ? { ...u, requestSent: true } : u));
      toast.success('Request sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAccept = async (requestId, fromUserId) => {
    await acceptRequest(requestId);
    socket.emit('request:accept', { toUserId: fromUserId, fromUserId: user.id });
    toast.success('Request accepted!');
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  return (
    <div className="flex flex-col h-full bg-surface-50 border-r border-white/5 w-[320px]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-800 text-white tracking-tight">Pulse</h1>
            <p className="text-xs text-white/30 mt-0.5">Messages</p>
          </div>
          <div className="flex items-center gap-2">
            {requests.length > 0 && (
              <button
                onClick={() => setShowRequests(v => !v)}
                className="relative w-9 h-9 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center transition-all"
                title="Friend Requests"
              >
                <span className="text-base">🔔</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red text-[9px] text-white flex items-center justify-center font-700">
                  {requests.length}
                </div>
              </button>
            )}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center transition-all text-white/40 hover:text-white/70"
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            className="input-field pl-10 text-sm"
            placeholder="Search people..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Requests panel */}
      {showRequests && requests.length > 0 && (
        <div className="mx-3 mb-3 rounded-2xl bg-surface-200 border border-primary-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-700 text-white/60 uppercase tracking-wider">Chat Requests</span>
            <button onClick={() => setShowRequests(false)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
          </div>
          {requests.map(req => (
            <div key={req.id} className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0">
              <Avatar user={req.fromUser} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-white truncate">{req.fromUser?.username}</p>
                <p className="text-xs text-white/30">wants to chat</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAccept(req.id, req.from)} className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-600 transition-all">
                  Accept
                </button>
                <button onClick={() => declineRequest(req.id)} className="px-3 py-1.5 rounded-lg bg-surface-400 hover:bg-surface-500 text-white/60 text-xs font-600 transition-all">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {searching && (
            <div className="px-3 py-8 text-center text-white/30 text-sm">Searching…</div>
          )}
          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="px-3 py-8 text-center text-white/30 text-sm">No users found</div>
          )}
          {searchResults.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-200 transition-all">
              <Avatar user={u} size={42} online={isOnline(u.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-white truncate">{u.username}</p>
                <p className="text-xs text-white/30">{isOnline(u.id) ? 'Online' : 'Offline'}</p>
              </div>
              {u.isContact ? (
                <span className="px-2.5 py-1 rounded-lg bg-accent-green/10 text-accent-green text-xs font-600">Contact</span>
              ) : u.requestSent ? (
                <span className="px-2.5 py-1 rounded-lg bg-surface-300 text-white/30 text-xs font-600">Sent</span>
              ) : u.requestReceived ? (
                <button onClick={() => handleAccept(u.requestId, u.id)} className="px-2.5 py-1 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-600 transition-all">
                  Accept
                </button>
              ) : (
                <button onClick={() => sendRequest(u.id)} className="px-2.5 py-1 rounded-lg bg-primary-500/20 hover:bg-primary-500 text-primary-400 hover:text-white text-xs font-600 transition-all border border-primary-500/30">
                  + Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contacts List */}
      {!searchQuery && (
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-surface-200 flex items-center justify-center text-3xl mb-4">💬</div>
              <p className="text-white/50 font-600 text-sm">No conversations yet</p>
              <p className="text-white/20 text-xs mt-2">Search for people to start chatting</p>
            </div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
                  activeContact?.id === contact.id ? 'bg-primary-500/15 border border-primary-500/20' : 'hover:bg-surface-200'
                }`}
              >
                <Avatar user={contact} size={46} online={isOnline(contact.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-600 text-white truncate">{contact.username}</p>
                    {contact.lastMessage && (
                      <span className="text-[10px] text-white/25 flex-shrink-0 ml-1">
                        {formatTime(contact.lastMessage?.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/35 truncate">
                    {contact.lastMessage?.type === 'file'
                      ? `📎 ${contact.lastMessage?.fileName || 'File'}`
                      : contact.lastMessage?.text || 'Say hello! 👋'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Current user */}
      <div className="p-4 border-t border-white/5 flex items-center gap-3">
        <div className="avatar-ring">
          <Avatar user={user} size={34} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-white truncate">{user?.username}</p>
          <p className="text-xs text-accent-green">● Active</p>
        </div>
      </div>
    </div>
  );
}
