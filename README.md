# 💬 Pulse — Real-Time Chat App

A full-stack real-time chat application built with **React + Tailwind CSS** (frontend) and **Node.js + Socket.io** (backend).

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | Register with username, password, mobile number |
| **OTP Verification** | 6-digit OTP sent to mobile (Twilio in prod) |
| **Profile Photo** | Upload avatar on signup |
| **Contact Requests** | Search by username, send/accept/decline requests |
| **Real-time Messaging** | Instant delivery via Socket.io |
| **File Sharing** | Images, videos, audio, PDFs, any file |
| **Typing Indicators** | Live "typing…" indicator |
| **Voice Calls** | WebRTC peer-to-peer audio calls |
| **Video Calls** | WebRTC peer-to-peer video calls |
| **Online Status** | Green dot shows who's online |
| **Dark UI** | Sleek dark theme with Tailwind CSS |

---

## 🏗️ Tech Stack

**Frontend**
- React 18
- Tailwind CSS 3
- Zustand (state management)
- Socket.io Client
- React Router v6
- Axios
- React Hot Toast

**Backend**
- Node.js + Express
- Socket.io
- JWT Authentication
- bcryptjs (password hashing)
- Multer (file uploads)
- In-memory storage (swap with MongoDB/PostgreSQL for production)

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- npm

### 1. Start the Backend

```bash
cd backend
npm install
node server.js
```

Backend runs on **http://localhost:5000**

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**

---

## 📱 How It Works

### Registration Flow
1. Enter username, password, mobile number, optional profile photo
2. Click "Send OTP" → OTP is generated (shown in console / dev banner in dev mode)
3. Enter the 6-digit OTP
4. Account created, redirected to inbox

### Adding Contacts
1. Use the search bar to find users by username
2. Click "+ Add" to send a chat request
3. The other person sees a 🔔 notification and can Accept/Decline
4. Once accepted, both appear in each other's inbox

### Messaging
- Text messages with Enter to send
- Attach any file with the paperclip icon
- Images display inline, videos play in-chat
- PDFs and other files show as download cards
- Real-time typing indicator

### Calls
- Click the 📞 phone icon for a voice call
- Click the 📹 video icon for a video call
- WebRTC peer-to-peer (no call server needed for local network)
- Mute / camera toggle during calls

---

## 🔧 Production Upgrades

To make this production-ready:

1. **OTP**: Integrate [Twilio Verify](https://www.twilio.com/verify) or AWS SNS
   ```js
   // In routes/auth.js, replace console.log(otp) with:
   const twilio = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
   await twilio.verify.v2.services(SERVICE_SID).verifications.create({ to: mobile, channel: 'sms' });
   ```

2. **Database**: Replace in-memory `db` with MongoDB (Mongoose) or PostgreSQL (Prisma)

3. **TURN Server**: Add TURN server config to WebRTC for calls across NAT/firewalls:
   ```js
   iceServers: [
     { urls: 'stun:stun.l.google.com:19302' },
     { urls: 'turn:your-turn-server.com', username: '...', credential: '...' }
   ]
   ```

4. **Environment Variables**: Set `JWT_SECRET`, `DB_URL`, `TWILIO_*` in `.env`

5. **HTTPS**: Required for camera/microphone access in production (WebRTC requirement)

---

## 📁 Project Structure

```
pulse-chat/
├── backend/
│   ├── server.js          # Express + Socket.io server
│   ├── routes/
│   │   ├── auth.js        # OTP, login, register
│   │   ├── users.js       # Search, requests, contacts
│   │   ├── chat.js        # Message history
│   │   └── upload.js      # File/avatar uploads
│   └── uploads/           # Uploaded files (auto-created)
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── AuthPage.jsx   # Login + Register + OTP
        │   └── ChatPage.jsx   # Main chat layout
        ├── components/
        │   ├── Sidebar.jsx    # Contact list + search
        │   ├── ChatWindow.jsx # Message thread + input
        │   ├── MessageBubble.jsx  # Message rendering
        │   ├── CallOverlay.jsx    # Voice/video call UI
        │   └── Avatar.jsx     # User avatar component
        ├── store/
        │   ├── authStore.js   # Auth state (Zustand)
        │   └── chatStore.js   # Chat state (Zustand)
        └── utils/
            ├── api.js         # Axios instance
            └── socket.js      # Socket.io singleton
```
