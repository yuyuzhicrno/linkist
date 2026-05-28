import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
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