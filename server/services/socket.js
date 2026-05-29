import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../data/db.js';
import { getJwtSecret } from '../config/index.js';

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
      const { userId } = jwt.verify(token, getJwtSecret());
      socket.userId = userId;
      socket.user = db.data.users.find(u => u.id === userId);
      if (!socket.user) {
        return next(new Error('User not found'));
      }
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on('join:channel', (channelId) => {
      const channel = db.data.channels.find(c => c.id === channelId);
      if (!channel) {
        socket.emit('error', { message: '频道不存在' });
        return;
      }
      if (!channel.isPublic && 
          !channel.memberIds.includes(socket.userId) && 
          channel.ownerId !== socket.userId && 
          socket.user.role !== 'admin') {
        socket.emit('error', { message: '无权加入此私密频道' });
        return;
      }
      socket.join(`channel:${channelId}`);
      console.log(`User ${socket.userId} joined channel ${channelId}`);
    });

    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('join:dm', (convoId) => {
      const convo = db.data.directMessages.find(d => d.id === convoId);
      if (!convo) {
        socket.emit('error', { message: '对话不存在' });
        return;
      }
      if (!convo.participants.includes(socket.userId) && socket.user.role !== 'admin') {
        socket.emit('error', { message: '无权加入此对话' });
        return;
      }
      socket.join(`dm:${convoId}`);
    });

    socket.on('leave:dm', (convoId) => {
      socket.leave(`dm:${convoId}`);
    });

    socket.on('join:user', (userId) => {
      if (userId !== socket.userId && socket.user.role !== 'admin') {
        socket.emit('error', { message: '只能加入自己的用户房间' });
        return;
      }
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