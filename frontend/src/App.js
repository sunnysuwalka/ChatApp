import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { token } = useAuthStore();
  if (token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { init, initialized } = useAuthStore();
  useEffect(() => { init(); }, []);

  if (!initialized) return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-primary-500 animate-pulse shadow-lg shadow-primary-500/40 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1C1C2E', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
        success: { iconTheme: { primary: '#00E5A0', secondary: '#1C1C2E' } },
        error: { iconTheme: { primary: '#FF4A6B', secondary: '#1C1C2E' } },
      }} />
      <Routes>
        <Route path="/auth" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
