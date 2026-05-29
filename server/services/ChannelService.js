import { v4 as uuidv4 } from 'uuid';
import { db, calcLevel, addXp, flushDatabase, recordDbOp } from '../data/db.js';
import { emitToChannel } from './socket.js';

export const CHANNEL_CREATE_LEVEL = 3;

export class ChannelService {
  createChannel({ name, description = '', icon = '💬', color = '#7c3aed', isPublic = true, ownerId }) {
    const channel = {
      id: uuidv4(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description,
      icon,
      color,
      isPublic,
      memberIds: [ownerId],
      ownerId,
      createdAt: new Date().toISOString(),
      messages: []
    };

    db.data.channels.push(channel);
    recordDbOp('insert', 'channels', channel.id, channel);
    addXp(ownerId, 20);
    flushDatabase();

    return channel;
  }

  getChannelById(id) {
    return db.data.channels.find(c => c.id === id) || null;
  }

  getChannelBySlug(slug) {
    return db.data.channels.find(c => c.slug === slug) || null;
  }

  getAllChannels(options = {}) {
    const { includePrivate = false, userId } = options;
    let channels = [...db.data.channels];

    if (!includePrivate && userId) {
      channels = channels.filter(c => 
        c.isPublic || 
        c.memberIds.includes(userId) || 
        c.ownerId === userId
      );
    }

    return channels;
  }

  joinChannel(channelId, userId) {
    const channel = db.data.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error('频道不存在');
    }

    if (channel.memberIds.includes(userId)) {
      return channel;
    }

    channel.memberIds.push(userId);
    recordDbOp('update', 'channels', channel.id);
    flushDatabase();

    return channel;
  }

  leaveChannel(channelId, userId) {
    const channel = db.data.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error('频道不存在');
    }

    if (channel.ownerId === userId) {
      throw new Error('所有者不能离开频道');
    }

    channel.memberIds = channel.memberIds.filter(id => id !== userId);
    recordDbOp('update', 'channels', channel.id);
    flushDatabase();

    return true;
  }

  sendMessage(channelId, { content, authorId }) {
    const channel = db.data.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error('频道不存在');
    }

    const author = db.data.users.find(u => u.id === authorId);
    const msg = {
      id: uuidv4(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    channel.messages.push(msg);
    recordDbOp('update', 'channels', channel.id);
    flushDatabase();

    const msgWithAuthor = {
      ...msg,
      author: author ? {
        id: author.id,
        username: author.username,
        avatar: author.avatar
      } : null
    };

    emitToChannel(channelId, 'message:new', msgWithAuthor);

    return msgWithAuthor;
  }

  reactToMessage(channelId, messageId, { emoji, userId }) {
    const channel = db.data.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error('频道不存在');
    }

    const msg = channel.messages.find(m => m.id === messageId);
    if (!msg) {
      throw new Error('消息不存在');
    }

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const idx = msg.reactions[emoji].indexOf(userId);
    if (idx === -1) {
      msg.reactions[emoji].push(userId);
    } else {
      msg.reactions[emoji].splice(idx, 1);
    }

    recordDbOp('update', 'channels', channel.id);
    flushDatabase();

    emitToChannel(channelId, 'message:reaction', {
      messageId: msg.id,
      reactions: msg.reactions
    });

    return msg.reactions;
  }

  canAccessChannel(channel, userId, userRole = 'member') {
    if (channel.isPublic) return true;
    if (userRole === 'admin') return true;
    if (channel.ownerId === userId) return true;
    if (channel.memberIds.includes(userId)) return true;
    return false;
  }

  canSendMessage(channel, userId, userRole = 'member') {
    return this.canAccessChannel(channel, userId, userRole);
  }
}

export const channelService = new ChannelService();