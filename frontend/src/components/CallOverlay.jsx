import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { getSocket } from '../utils/socket';

export default function CallOverlay({ contact, callType, isIncoming, onEnd, localStream, remoteStream, onAccept, onReject }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(!isIncoming);
  const timerRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setCallConnected(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
    setMuted(m => !m);
  };

  const toggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
    setVideoOff(v => !v);
  };

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const BtnClass = "w-12 h-12 rounded-full flex items-center justify-center transition-all text-white";

  return (
    <div className="call-overlay animate-fade-up">
      {callType === 'video' && (
        <>
          {remoteStream && (
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
          )}
          {localStream && (
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-6 w-36 h-24 rounded-2xl object-cover border-2 border-white/20 z-10" style={{ display: videoOff ? 'none' : 'block' }} />
          )}
        </>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {(!remoteStream || callType === 'audio') && (
          <div className="flex flex-col items-center gap-4 mb-12">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full bg-primary-500/30 ${callConnected ? 'animate-pulse-glow' : ''}`} style={{ transform: 'scale(1.3)' }} />
              <Avatar user={contact} size={96} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-800 text-white">{contact?.username}</h2>
              <p className="text-white/50 text-sm mt-1">
                {isIncoming && !callConnected
                  ? `Incoming ${callType} call…`
                  : callConnected
                    ? formatDuration(duration)
                    : 'Calling…'}
              </p>
            </div>
          </div>
        )}

        {/* Call action buttons */}
        <div className="flex items-center gap-4">
          {isIncoming && !callConnected ? (
            <>
              <button onClick={onReject} className={`${BtnClass} w-16 h-16 bg-accent-red hover:bg-red-600 shadow-lg shadow-red-500/30`}>
                <PhoneDown />
              </button>
              <button onClick={onAccept} className={`${BtnClass} w-16 h-16 bg-accent-green hover:bg-green-500 shadow-lg shadow-green-500/30`}>
                <PhoneUp />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} className={`${BtnClass} ${muted ? 'bg-accent-red/20 border border-accent-red/50' : 'bg-surface-300 hover:bg-surface-400'}`}>
                {muted ? <MicOff /> : <Mic />}
              </button>
              {callType === 'video' && (
                <button onClick={toggleVideo} className={`${BtnClass} ${videoOff ? 'bg-accent-red/20 border border-accent-red/50' : 'bg-surface-300 hover:bg-surface-400'}`}>
                  {videoOff ? <VideoOff /> : <VideoIcon />}
                </button>
              )}
              <button onClick={onEnd} className={`${BtnClass} w-16 h-16 bg-accent-red hover:bg-red-600 shadow-lg shadow-red-500/30`}>
                <PhoneDown />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Mic = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>;
const MicOff = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/></svg>;
const VideoIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const VideoOff = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const PhoneDown = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 9.9a16 16 0 0 0 3.52 3.41z" transform="rotate(135 12 12)"/></svg>;
const PhoneUp = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 9.9a16 16 0 0 0 6.93 6.93l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
