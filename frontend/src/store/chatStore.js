import { create } from 'zustand';
import api from '../utils/api';

export const useChatStore = create((set, get) => ({
  contacts: [],
  activeContact: null,
  messages: {},
  typingUsers: {},
  requests: [],
  onlineUsers: [],

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  loadContacts: async () => {
    try {
      const res = await api.get('/users/contacts');
      set({ contacts: res.data });
    } catch {}
  },

  loadRequests: async () => {
    try {
      const res = await api.get('/users/requests');
      set({ requests: res.data });
    } catch {}
  },

  setActiveContact: (contact) => set({ activeContact: contact }),

  loadMessages: async (roomId) => {
    try {
      const res = await api.get(`/chat/${roomId}`);
      set(state => ({ messages: { ...state.messages, [roomId]: res.data } }));
    } catch {}
  },

  addMessage: (roomId, message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), message],
      },
      contacts: state.contacts.map(c =>
        c.roomId === roomId ? { ...c, lastMessage: message } : c
      ),
    }));
  },

  setTyping: (roomId, userId, isTyping) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: isTyping
          ? [...new Set([...(state.typingUsers[roomId] || []), userId])]
          : (state.typingUsers[roomId] || []).filter(id => id !== userId),
      },
    }));
  },

  addRequest: (request) => {
    set(state => ({ requests: [...state.requests, request] }));
  },

  acceptRequest: async (requestId) => {
    try {
      await api.put(`/users/request/${requestId}`, { action: 'accept' });
      set(state => ({ requests: state.requests.filter(r => r.id !== requestId) }));
      get().loadContacts();
    } catch {}
  },

  declineRequest: async (requestId) => {
    try {
      await api.put(`/users/request/${requestId}`, { action: 'decline' });
      set(state => ({ requests: state.requests.filter(r => r.id !== requestId) }));
    } catch {}
  },
}));
