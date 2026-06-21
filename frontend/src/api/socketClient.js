import { io } from 'socket.io-client';

// Same origin axiosClient.js uses - empty string locally (same-origin,
// proxied by Vite), the Render backend URL in production (Vercel + Render
// are different domains, so this must be explicit there).
const API_ORIGIN = import.meta.env.VITE_API_URL || '/';

let socket = null;

/** Lazily creates a single authenticated socket connection, reusing the JWT cookie. */
export function getSocket() {
  if (!socket) {
    socket = io(API_ORIGIN, { withCredentials: true, autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

