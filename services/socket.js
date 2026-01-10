import { io } from "socket.io-client";

const SOCKET_URL = "http://10.185.247.132:5000";

let socket = null;

export const connectSocket = (userId) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: true,
    auth: {
      userId, // 🔥 REQUIRED for auto-join
    },
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ Socket error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
