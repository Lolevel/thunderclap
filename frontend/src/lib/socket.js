import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Manual connection control
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Connection lifecycle logging
socket.on('connect', () => {
  console.log('[WebSocket] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[WebSocket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[WebSocket] Connection error:', error);
});

export default socket;
