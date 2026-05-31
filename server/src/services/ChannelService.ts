import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Channel, ChannelMessage } from '../types';

export class ChannelService {
  constructor(private repo: Repository) {}

  async createChannel({ name, description = '', icon = '💬', color = '#7c3aed', isPublic = true, ownerId }: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isPublic?: boolean;
    ownerId: string;
  }): Promise<Channel> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const existing = await this.repo.channelBySlug(slug);
    if (existing) {
      throw new Error('该频道名称已存在');
    }

    const channel: Omit<Channel, 'createdAt' | 'messageCount'> = {
      id: uuidv4(),
      name,
      slug,
      description,
      icon,
      color,
      isPublic,
      ownerId,
      memberIds: [ownerId]
    };

    return await this.repo.createChannel(channel);
  }

  async getChannels(options: { includePrivate?: boolean; userId?: string } = {}): Promise<Channel[]> {
    return await this.repo.channels(options) as Channel[];
  }

  async getChannelById(id: string): Promise<Channel | null> {
    return await this.repo.channelById(id);
  }

  async getChannelBySlug(slug: string): Promise<Channel | null> {
    return await this.repo.channelBySlug(slug);
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
    return await this.repo.updateChannel(id, updates);
  }

  async joinChannel(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.repo.channelById(channelId);
    if (!channel) throw new Error('频道不存在');

    if (!channel.isPublic) {
      throw new Error('无法加入私密频道');
    }

    const memberIds = [...(channel.memberIds || [])];
    if (!memberIds.includes(userId)) {
      memberIds.push(userId);
      await this.repo.updateChannel(channelId, { memberIds });
    }

    return channel;
  }

  async sendMessage(channelId: string, { content, authorId }: { content: string; authorId: string }): Promise<ChannelMessage> {
    const channel = await this.repo.channelById(channelId);
    if (!channel) throw new Error('频道不存在');

    if (!channel.isPublic && !channel.memberIds?.includes(authorId)) {
      throw new Error('您不是该频道成员');
    }

    const msg: Omit<ChannelMessage, 'createdAt'> = {
      id: uuidv4(),
      channelId,
      authorId,
      content
    };

    return await this.repo.createChannelMessage(msg);
  }

  async getChannelMessages(channelId: string, options: { limit?: number; offset?: number } = {}): Promise<ChannelMessage[]> {
    return await this.repo.channelMessages(channelId, options) as ChannelMessage[];
  }

  async addReaction(channelId: string, messageId: string, emoji: string, userId: string): Promise<Record<string, string[]>> {
    const reactions = await this.repo.toggleReaction(messageId, 'channel', emoji, userId);
    const result: Record<string, string[]> = {};
    for (const r of reactions) {
      result[r.emoji] = r.userIds;
    }
    return result;
  }
}