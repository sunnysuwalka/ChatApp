import React, { useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../utils/socket';

export default function ChatPage() {
  const { activeContact, setActiveContact, setOnlineUsers } = useChatStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  useEffect(() => {
    if (user) {
      socket.emit('user:online', user.id);
      socket.on('users:online', (users) => setOnlineUsers(users));
    }
    return () => socket.off('users:online');
  }, [user]);

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar onSelectContact={setActiveContact} />
      <div className="flex-1 flex flex-col min-w-0">
        {activeContact ? (
          <ChatWindow contact={activeContact} key={activeContact.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-5xl shadow-xl shadow-primary-500/10">
                💬
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-xl">
                ✨
              </div>
            </div>
            <h2 className="text-2xl font-800 text-white mb-3 tracking-tight">Start a conversation</h2>
            <p className="text-white/30 text-sm max-w-xs leading-relaxed">
              Search for someone by username to start chatting, or select a conversation from your inbox.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
