import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { ChannelService } from '../../services/ChannelService.js';

describe('ChannelService', () => {
  let channelService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    channelService = new ChannelService(mockRepoInstance);

    mockRepo.data.channels = [];
    mockRepo.data.users = [];
  });

  describe('createChannel', () => {
    it('should create a channel with required fields', async () => {
      const channelData = {
        name: 'General Chat',
        ownerId: 'user-1'
      };

      const result = await channelService.createChannel(channelData);

      expect(result).toBeDefined();
      expect(result.name).toBe('General Chat');
      expect(result.slug).toBe('general-chat');
      expect(result.ownerId).toBe('user-1');
      expect(result.memberIds).toContain('user-1');
      expect(mockRepoInstance.createChannel).toHaveBeenCalled();
    });

    it('should throw error if channel name already exists', async () => {
      mockRepo.data.channels = [{ name: 'Existing', slug: 'existing', ownerId: 'user-1' }];
      mockRepoInstance.channelBySlug.mockResolvedValue(mockRepo.data.channels[0]);

      await expect(channelService.createChannel({ name: 'Existing', ownerId: 'user-2' }))
        .rejects.toThrow('该频道名称已存在');
    });

    it('should generate correct slug from name', async () => {
      const result = await channelService.createChannel({
        name: 'My Channel Name',
        ownerId: 'user-1'
      });

      expect(result.slug).toBe('my-channel-name');
    });

    it('should handle special characters in name', async () => {
      const result = await channelService.createChannel({
        name: 'Channel with @#$!',
        ownerId: 'user-1'
      });

      expect(result.slug).toBe('channel-with-');
    });

    it('should set default values for optional fields', async () => {
      const result = await channelService.createChannel({
        name: 'Test Channel',
        ownerId: 'user-1'
      });

      expect(result.description).toBe('');
      expect(result.icon).toBe('💬');
      expect(result.color).toBe('#7c3aed');
      expect(result.isPublic).toBe(true);
    });
  });

  describe('getChannels', () => {
    it('should return all channels from repo', async () => {
      mockRepo.data.channels = [
        { id: '1', name: 'Channel 1' },
        { id: '2', name: 'Channel 2' }
      ];

      const result = await channelService.getChannels();

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.channels).toHaveBeenCalled();
    });

    it('should pass options to repo', async () => {
      const options = { includePrivate: true, userId: 'user-1' };

      await channelService.getChannels(options);

      expect(mockRepoInstance.channels).toHaveBeenCalledWith(options);
    });
  });

  describe('getChannelById', () => {
    it('should return channel by id', async () => {
      mockRepo.data.channels = [{ id: 'channel-1', name: 'Test Channel' }];
      mockRepoInstance.channelById.mockResolvedValue(mockRepo.data.channels[0]);

      const result = await channelService.getChannelById('channel-1');

      expect(result.id).toBe('channel-1');
    });
  });

  describe('getChannelBySlug', () => {
    it('should return channel by slug', async () => {
      mockRepoInstance.channelBySlug.mockResolvedValue({ id: 'channel-1', slug: 'test-channel' });

      const result = await channelService.getChannelBySlug('test-channel');

      expect(result.slug).toBe('test-channel');
    });
  });

  describe('updateChannel', () => {
    it('should update channel', async () => {
      const updated = { id: 'channel-1', name: 'Updated Name' };
      mockRepoInstance.updateChannel.mockResolvedValue(updated);

      const result = await channelService.updateChannel('channel-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('joinChannel', () => {
    beforeEach(() => {
      mockRepo.data.channels = [{
        id: 'channel-1',
        isPublic: true,
        memberIds: ['owner-1']
      }];
      mockRepoInstance.channelById.mockImplementation(async (id) => {
        return mockRepo.data.channels.find(c => c.id === id) || null;
      });
      mockRepoInstance.updateChannel.mockImplementation(async (id, updates) => {
        const channel = mockRepo.data.channels.find(c => c.id === id);
        if (channel) Object.assign(channel, updates);
        return channel;
      });
    });

    it('should allow user to join public channel', async () => {
      const result = await channelService.joinChannel('channel-1', 'user-1');

      expect(mockRepo.data.channels[0].memberIds).toContain('user-1');
    });

    it('should not add user twice', async () => {
      mockRepo.data.channels[0].memberIds = ['owner-1', 'user-1'];

      await channelService.joinChannel('channel-1', 'user-1');

      const count = mockRepo.data.channels[0].memberIds.filter(id => id === 'user-1').length;
      expect(count).toBe(1);
    });

    it('should throw error for non-existent channel', async () => {
      mockRepoInstance.channelById.mockResolvedValue(null);

      await expect(channelService.joinChannel('nonexistent', 'user-1'))
        .rejects.toThrow('频道不存在');
    });

    it('should throw error when joining private channel', async () => {
      mockRepo.data.channels[0].isPublic = false;

      await expect(channelService.joinChannel('channel-1', 'user-1'))
        .rejects.toThrow('无法加入私密频道');
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockRepo.data.channels = [{
        id: 'channel-1',
        isPublic: true,
        memberIds: ['owner-1', 'user-1'],
        messages: []
      }];
      mockRepoInstance.channelById.mockImplementation(async (id) => {
        return mockRepo.data.channels.find(c => c.id === id) || null;
      });
      mockRepoInstance.createChannelMessage.mockImplementation(async (msg) => {
        const channel = mockRepo.data.channels.find(c => c.id === msg.channelId);
        if (channel) {
          channel.messages.push(msg);
        }
        return msg;
      });
    });

    it('should send message to channel', async () => {
      const result = await channelService.sendMessage('channel-1', {
        content: 'Hello everyone!',
        authorId: 'user-1'
      });

      expect(result.content).toBe('Hello everyone!');
      expect(result.authorId).toBe('user-1');
    });

    it('should throw error for non-existent channel', async () => {
      mockRepoInstance.channelById.mockResolvedValue(null);

      await expect(channelService.sendMessage('nonexistent', { content: 'Hi', authorId: 'user-1' }))
        .rejects.toThrow('频道不存在');
    });

    it('should throw error if non-member tries to send message to private channel', async () => {
      mockRepo.data.channels[0].isPublic = false;
      mockRepo.data.channels[0].memberIds = ['owner-1'];

      await expect(channelService.sendMessage('channel-1', {
        content: 'Hello',
        authorId: 'user-1'
      })).rejects.toThrow('您不是该频道成员');
    });
  });

  describe('getChannelMessages', () => {
    it('should return messages from repo', async () => {
      const messages = [
        { id: 'msg-1', content: 'Message 1' },
        { id: 'msg-2', content: 'Message 2' }
      ];
      mockRepoInstance.channelMessages.mockResolvedValue(messages);

      const result = await channelService.getChannelMessages('channel-1');

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.channelMessages).toHaveBeenCalledWith('channel-1', {});
    });

    it('should pass options to repo', async () => {
      const options = { limit: 50 };

      await channelService.getChannelMessages('channel-1', options);

      expect(mockRepoInstance.channelMessages).toHaveBeenCalledWith('channel-1', options);
    });
  });

  describe('addReaction', () => {
    it('should delegate to repo toggleReaction', async () => {
      mockRepoInstance.toggleReaction.mockResolvedValue({});

      await channelService.addReaction('channel-1', 'msg-1', '👍', 'user-1');

      expect(mockRepoInstance.toggleReaction).toHaveBeenCalledWith('msg-1', 'channel', '👍', 'user-1');
    });
  });
});