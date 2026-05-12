import React from 'react';

const COLORS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-green-500 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-red-500 to-rose-400',
  'from-indigo-500 to-violet-400',
];

function getColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ user, size = 40, online = false, className = '' }) {
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const color = getColor(user?.username || '?');

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className="w-full h-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-700`}
          style={{ fontSize: size * 0.38 }}
        >
          {initials}
        </div>
      )}
      {online && (
        <div
          className="absolute bottom-0 right-0 rounded-full bg-accent-green border-2 border-surface-0"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
