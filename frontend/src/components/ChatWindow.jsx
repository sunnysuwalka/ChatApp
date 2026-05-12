import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import CallOverlay from './CallOverlay';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ChatWindow({ contact }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [callState, setCallState] = useState(null); // { type, incoming, offer }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const peerRef = useRef(null);

  const { messages, loadMessages, addMessage, typingUsers, setTyping } = useChatStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  const roomId = [user.id, contact.id].sort().join('_');
  const roomMessages = messages[roomId] || [];
  const typingInRoom = typingUsers[roomId] || [];
  const contactIsTyping = typingInRoom.includes(contact.id);

  useEffect(() => {
    socket.emit('room:join', roomId);
    loadMessages(roomId);

    socket.on('message:new', (msg) => addMessage(roomId, msg));
    socket.on('typing:start', (uid) => { if (uid === contact.id) setTyping(roomId, uid, true); });
    socket.on('typing:stop', (uid) => { if (uid === contact.id) setTyping(roomId, uid, false); });

    // WebRTC signaling
    socket.on('call:offer', handleIncomingCall);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:end', handleRemoteCallEnd);
    socket.on('call:reject', () => { toast.error('Call declined'); endCall(false); });

    return () => {
      socket.emit('room:leave', roomId);
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:end');
      socket.off('call:reject');
    };
  }, [contact.id, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  // --- Messaging ---
  const handleTyping = (val) => {
    setText(val);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { roomId, userId: user.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', { roomId, userId: user.id });
    }, 1500);
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const msg = { text: text.trim(), type: 'text', senderId: user.id, senderName: user.username };
    socket.emit('message:send', { roomId, message: msg });
    setText('');
    setIsTyping(false);
    socket.emit('typing:stop', { roomId, userId: user.id });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload/file', fd);
      const msg = {
        type: res.data.type,
        url: res.data.url,
        fileName: res.data.originalName,
        fileSize: res.data.size,
        mimetype: res.data.mimetype,
        senderId: user.id,
        senderName: user.username,
      };
      socket.emit('message:send', { roomId, message: msg });
    } catch {
      toast.error('File upload failed');
    }
    setUploading(false);
    fileInputRef.current.value = '';
  };

  // --- WebRTC ---
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice-candidate', { to: contact.id, candidate: e.candidate });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    return pc;
  }, [contact.id]);

  const startCall = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      peerRef.current = pc;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { to: contact.id, from: user.id, offer, type });
      setCallState({ type, incoming: false });
    } catch (err) {
      toast.error('Could not access camera/microphone');
    }
  };

  const handleIncomingCall = async ({ from, offer, type }) => {
    if (from !== contact.id) return;
    setCallState({ type, incoming: true, offer, from });
  };

  const acceptCall = async () => {
    const { offer, type, from } = callState;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      peerRef.current = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { to: from, answer });
      setCallState(prev => ({ ...prev, incoming: false }));
    } catch {
      toast.error('Could not start call');
    }
  };

  const handleCallAnswer = async ({ answer }) => {
    if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async ({ candidate }) => {
    if (peerRef.current && candidate) await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const endCall = (notify = true) => {
    if (notify) socket.emit('call:end', { to: contact.id });
    peerRef.current?.close();
    peerRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
  };

  const rejectCall = () => {
    socket.emit('call:reject', { to: callState.from });
    setCallState(null);
  };

  const handleRemoteCallEnd = () => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    toast('Call ended', { icon: '📞' });
  };

  const isOnline = useChatStore(s => s.onlineUsers.includes(contact.id));

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  roomMessages.forEach((msg, i) => {
    const d = new Date(msg.timestamp).toDateString();
    if (d !== lastDate) { groupedMessages.push({ type: 'date', date: d }); lastDate = d; }
    const prev = roomMessages[i - 1];
    const showAvatar = !prev || prev.senderId !== msg.senderId;
    groupedMessages.push({ type: 'msg', msg, showAvatar });
  });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Call overlay */}
      {callState && (
        <CallOverlay
          contact={contact}
          callType={callState.type}
          isIncoming={callState.incoming}
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={() => endCall(true)}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-50">
        <div className="flex items-center gap-3">
          <Avatar user={contact} size={42} online={isOnline} />
          <div>
            <h2 className="text-base font-700 text-white">{contact.username}</h2>
            <p className="text-xs text-white/30">
              {contactIsTyping ? (
                <span className="text-accent-cyan">typing…</span>
              ) : isOnline ? (
                <span className="text-accent-green">Online</span>
              ) : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CallButton icon={<PhoneIcon />} label="Voice call" onClick={() => startCall('audio')} />
          <CallButton icon={<VideoIcon />} label="Video call" onClick={() => startCall('video')} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {groupedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-surface-200 flex items-center justify-center text-4xl mb-5 shadow-inner">
              👋
            </div>
            <h3 className="text-white font-700 text-lg mb-2">Say hello to {contact.username}!</h3>
            <p className="text-white/30 text-sm">This is the start of your conversation.</p>
          </div>
        )}
        {groupedMessages.map((item, i) => {
          if (item.type === 'date') return (
            <div key={`date-${i}`} className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[11px] text-white/25 font-600">{formatDate(item.date)}</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          );
          const { msg, showAvatar } = item;
          const isMine = msg.senderId === user.id;
          return (
            <MessageBubble
              key={msg.id || i}
              message={msg}
              isMine={isMine}
              showAvatar={showAvatar}
              avatar={<Avatar user={contact} size={28} />}
            />
          );
        })}
        {contactIsTyping && (
          <div className="flex items-end gap-2">
            <Avatar user={contact} size={28} />
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-surface-300">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-5 pb-5 pt-3 border-t border-white/5">
        <form onSubmit={sendMessage} className="flex items-end gap-3">
          {/* File attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-white/40 hover:text-white/70 transition-all flex-shrink-0 mb-0.5"
            title="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              className="input-field resize-none min-h-[44px] max-h-[120px] py-3 pr-4 leading-relaxed"
              placeholder={`Message ${contact.username}…`}
              value={text}
              onChange={e => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ height: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
          </div>

          {/* Send */}
          <button
            type="submit"
            disabled={!text.trim() || uploading}
            className="w-11 h-11 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all flex-shrink-0 shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 active:translate-y-0 mb-0.5"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </form>
        <p className="text-[10px] text-white/15 mt-2 ml-14">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

const CallButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className="w-9 h-9 rounded-xl bg-surface-200 hover:bg-primary-500/20 text-white/40 hover:text-primary-400 flex items-center justify-center transition-all border border-transparent hover:border-primary-500/30"
  >
    {icon}
  </button>
);

const PhoneIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.16 9.9a16 16 0 0 0 6.93 6.93l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const VideoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
