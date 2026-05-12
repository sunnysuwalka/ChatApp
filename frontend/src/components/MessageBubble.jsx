import React from 'react';

export default function MessageBubble({ message, isMine, showAvatar, avatar }) {
  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <div className="overflow-hidden rounded-xl">
          <img
            src={message.url}
            alt="Image"
            className="max-w-[280px] max-h-[300px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.url, '_blank')}
          />
        </div>
      );
    }

    if (message.type === 'video') {
      return (
        <video
          src={message.url}
          controls
          className="max-w-[280px] rounded-xl"
        />
      );
    }

    if (message.type === 'audio') {
      return (
        <audio src={message.url} controls className="max-w-[240px]" />
      );
    }

    if (message.type === 'file') {
      return (
        <a
          href={message.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all max-w-[260px]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-xl flex-shrink-0">
            {message.mimetype?.includes('pdf') ? '📄' : '📁'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-600 text-white truncate">{message.fileName}</p>
            <p className="text-xs text-white/40">{formatSize(message.fileSize)}</p>
          </div>
          <svg className="flex-shrink-0 text-white/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </a>
      );
    }

    return (
      <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
    );
  };

  return (
    <div className={`flex items-end gap-2 msg-enter ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-7 flex-shrink-0">
        {showAvatar && !isMine && avatar}
      </div>
      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMine
              ? 'bg-primary-500 text-white rounded-br-md shadow-lg shadow-primary-500/20'
              : 'bg-surface-300 text-white/90 rounded-bl-md'
          } ${message.type === 'image' || message.type === 'video' ? 'p-1.5' : ''}`}
        >
          {renderContent()}
        </div>
        <span className="text-[10px] text-white/20 mt-1 px-1 font-mono">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
