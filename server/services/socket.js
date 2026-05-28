import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const { userId } = jwt.verify(token, JWT_SECRET);
      socket.userId = userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on('join:channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`User ${socket.userId} joined channel ${channelId}`);
    });

    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('join:dm', (convoId) => {
      socket.join(`dm:${convoId}`);
    });

    socket.on('leave:dm', (convoId) => {
      socket.leave(`dm:${convoId}`);
    });

    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToChannel(channelId, event, data) {
  if (io) {
    io.to(`channel:${channelId}`).emit(event, data);
  }
}

export function emitToDm(convoId, event, data) {
  if (io) {
    io.to(`dm:${convoId}`).emit(event, data);
  }
}

export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitDmToParticipants(conversation, event, data) {
  if (io && conversation?.participants) {
    conversation.participants.forEach(pid => {
      io.to(`user:${pid}`).emit(event, data);
    });
  }
}