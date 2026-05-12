import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_API_URL.replace('/api', ''), {
  transports: ['websocket'],
  withCredentials: true
});;
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};