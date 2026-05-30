import { v4 as uuidv4 } from 'uuid';

export class ChannelService {
  constructor(repo) {
    this.repo = repo;
  }

  async createChannel({ name, description = '', icon = '💬', color = '#7c3aed', isPublic = true, ownerId }) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const existing = await this.repo.channelBySlug(slug);
    if (existing) {
      throw new Error('该频道名称已存在');
    }

    const channel = {
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

  async getChannels(options = {}) {
    return await this.repo.channels(options);
  }

  async getChannelById(id) {
    return await this.repo.channelById(id);
  }

  async getChannelBySlug(slug) {
    return await this.repo.channelBySlug(slug);
  }

  async updateChannel(id, updates) {
    return await this.repo.updateChannel(id, updates);
  }

  async joinChannel(channelId, userId) {
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

  async sendMessage(channelId, { content, authorId }) {
    const channel = await this.repo.channelById(channelId);
    if (!channel) throw new Error('频道不存在');

    if (!channel.isPublic && !channel.memberIds?.includes(authorId)) {
      throw new Error('您不是该频道成员');
    }

    const msg = await this.repo.createChannelMessage({
      id: uuidv4(),
      channelId,
      authorId,
      content
    });

    return msg;
  }

  async getChannelMessages(channelId, options = {}) {
    return await this.repo.channelMessages(channelId, options);
  }

  async addReaction(channelId, messageId, emoji, userId) {
    return await this.repo.toggleReaction(messageId, 'channel', emoji, userId);
  }
}