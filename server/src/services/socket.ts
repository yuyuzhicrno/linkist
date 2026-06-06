import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Server as HttpServer } from 'http';
import { getServices } from './services-registry';
import { getJwtSecret } from '../config/index';
import type { User, DirectMessage } from '../types/index';

interface AuthSocket extends Socket {
  userId: string;
  user: User;
}

interface SocketData {
  message: string;
}

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  });

  io.use(async (socket: Socket, next) => {
    const authSocket = socket as AuthSocket;
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
      authSocket.userId = decoded.userId;
      const user = await getServices().user.getUserById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }
      authSocket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    console.log(`User connected: ${authSocket.userId}`);

    socket.on('join:channel', async (channelId: string) => {
      const channel = await getServices().channel.getChannelById(channelId);
      if (!channel) {
        socket.emit('error', { message: '频道不存在' } as SocketData);
        return;
      }
      if (!channel.isPublic &&
          !channel.memberIds?.includes(authSocket.userId) &&
          channel.ownerId !== authSocket.userId &&
          authSocket.user.role !== 'admin') {
        socket.emit('error', { message: '无权加入此私密频道' } as SocketData);
        return;
      }
      socket.join(`channel:${channelId}`);
      console.log(`User ${authSocket.userId} joined channel ${channelId}`);
    });

    socket.on('leave:channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('join:dm', async (convoId: string) => {
      const convo = await getServices().friend.getDirectMessageById(convoId);
      if (!convo) {
        socket.emit('error', { message: '对话不存在' } as SocketData);
        return;
      }
      if (!convo.participants?.includes(authSocket.userId) && authSocket.user.role !== 'admin') {
        socket.emit('error', { message: '无权加入此对话' } as SocketData);
        return;
      }
      socket.join(`dm:${convoId}`);
    });

    socket.on('leave:dm', (convoId: string) => {
      socket.leave(`dm:${convoId}`);
    });

    socket.on('join:user', (userId: string) => {
      if (userId !== authSocket.userId && authSocket.user.role !== 'admin') {
        socket.emit('error', { message: '只能加入自己的用户房间' } as SocketData);
        return;
      }
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${authSocket.userId}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToChannel(channelId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`channel:${channelId}`).emit(event, data);
  }
}

export function emitToDm(convoId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`dm:${convoId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitDmToParticipants(conversation: DirectMessage | null, event: string, data: unknown): void {
  if (io && conversation?.participants) {
    conversation.participants.forEach(pid => {
      io!.to(`user:${pid}`).emit(event, data);
    });
  }
}