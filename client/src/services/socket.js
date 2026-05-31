import { io } from 'socket.io-client';

let socket = null;
let heartbeatInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_DELAY_BASE = 1000;

export function initSocket(token) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY_BASE,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    pingInterval: HEARTBEAT_INTERVAL,
    pingTimeout: 5000
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    reconnectAttempts = 0;
    startHeartbeat();
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    stopHeartbeat();
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    reconnectAttempts = 0;
  });

  socket.on('reconnect_error', (err) => {
    console.warn('Socket reconnection error:', err.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after max attempts');
  });

  return socket;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChannel(channelId) {
  if (socket) {
    socket.emit('join:channel', channelId);
  }
}

export function leaveChannel(channelId) {
  if (socket) {
    socket.emit('leave:channel', channelId);
  }
}

export function joinDm(convoId) {
  if (socket) {
    socket.emit('join:dm', convoId);
  }
}

export function leaveDm(convoId) {
  if (socket) {
    socket.emit('leave:dm', convoId);
  }
}

export function joinUser(userId) {
  if (socket) {
    socket.emit('join:user', userId);
  }
}

export function onChannelMessage(callback) {
  if (socket) {
    socket.on('message:new', callback);
    return () => socket.off('message:new', callback);
  }
  return () => {};
}

export function onChannelReaction(callback) {
  if (socket) {
    socket.on('message:reaction', callback);
    return () => socket.off('message:reaction', callback);
  }
  return () => {};
}

export function onDmMessage(callback) {
  if (socket) {
    socket.on('dm:message:new', callback);
    return () => socket.off('dm:message:new', callback);
  }
  return () => {};
}

export function onNotification(callback) {
  if (socket) {
    socket.on('notification:new', callback);
    return () => socket.off('notification:new', callback);
  }
  return () => {};
}