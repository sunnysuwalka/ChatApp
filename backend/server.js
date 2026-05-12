const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://chat-app-chi-five-44.vercel.app'
];

// Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Express CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload dirs exist
['uploads/avatars', 'uploads/files'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// In-memory DB (production would use MongoDB/PostgreSQL)
const db = {
  users: [],       // { id, username, password, mobile, avatar, createdAt }
  otps: {},        // mobile -> { otp, expires, pendingUser }
  sessions: {},    // token -> userId
  requests: [],    // { id, from, to, status, createdAt }
  contacts: {},    // userId -> [userId]
  messages: {},    // roomId -> [message]
};

const authRoutes = require('./routes/auth')(db);
const userRoutes = require('./routes/users')(db);
const chatRoutes = require('./routes/chat')(db);
const uploadRoutes = require('./routes/upload')(db);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.io
const onlineUsers = {}; // userId -> socketId

io.on('connection', (socket) => {
  socket.on('user:online', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('users:online', Object.keys(onlineUsers));
  });

  socket.on('message:send', (data) => {
    const { roomId, message } = data;
    if (!db.messages[roomId]) db.messages[roomId] = [];

    const msg = {
      id: Date.now().toString(),
      ...message,
      timestamp: new Date().toISOString()
    };

    db.messages[roomId].push(msg);
    io.to(roomId).emit('message:new', msg);
  });

  socket.on('room:join', (roomId) => {
    socket.join(roomId);
  });

  socket.on('room:leave', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('typing:start', ({ roomId, userId }) => {
    socket.to(roomId).emit('typing:start', userId);
  });

  socket.on('typing:stop', ({ roomId, userId }) => {
    socket.to(roomId).emit('typing:stop', userId);
  });

  // Friend request events
  socket.on('request:send', (data) => {
    const targetSocket = onlineUsers[data.toUserId];
    if (targetSocket) {
      io.to(targetSocket).emit('request:received', data);
    }
  });

  socket.on('request:accept', (data) => {
    const targetSocket = onlineUsers[data.toUserId];
    if (targetSocket) {
      io.to(targetSocket).emit('request:accepted', data);
    }
  });

  // WebRTC signaling
  socket.on('call:offer', (data) => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('call:offer', {
        ...data,
        from: data.from
      });
    }
  });

  socket.on('call:answer', (data) => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('call:answer', data);
    }
  });

  socket.on('call:ice-candidate', (data) => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('call:ice-candidate', data);
    }
  });

  socket.on('call:end', (data) => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('call:end');
    }
  });

  socket.on('call:reject', (data) => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('call:reject');
    }
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find(
      id => onlineUsers[id] === socket.id
    );

    if (userId) {
      delete onlineUsers[userId];
      io.emit('users:online', Object.keys(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { db, io };