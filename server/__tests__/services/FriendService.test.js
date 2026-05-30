import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { FriendService } from '../../services/FriendService.js';

describe('FriendService', () => {
  let friendService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    friendService = new FriendService(mockRepoInstance);

    mockRepo.data.users = [];
    mockRepo.data.directMessages = [];
    mockRepo.data.notifications = [];
  });

  describe('sendFriendRequest', () => {
    beforeEach(() => {
      mockRepoInstance.updateUser.mockImplementation(async (id, updates) => {
        const user = mockRepo.data.users.find(u => u.id === id);
        if (user) Object.assign(user, updates);
        return user;
      });
      mockRepoInstance.createNotification.mockImplementation(async (notification) => {
        mockRepo.data.notifications.push(notification);
        return notification;
      });
    });

    it('should send friend request from one user to another', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'User One', friendRequests: [] },
        { id: 'user-2', username: 'User Two', friendRequests: [] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      const result = await friendService.sendFriendRequest('user-1', 'user-2');

      expect(result).toBe(true);
      expect(mockRepo.data.users[1].friendRequests).toContain('user-1');
    });

    it('should throw error when sending request to self', async () => {
      await expect(friendService.sendFriendRequest('user-1', 'user-1'))
        .rejects.toThrow('不能向自己发送好友请求');
    });

    it('should throw error if recipient does not exist', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await expect(friendService.sendFriendRequest('user-1', 'nonexistent'))
        .rejects.toThrow('用户不存在');
    });

    it('should throw error if request already sent', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'User One', friendRequests: [] },
        { id: 'user-2', username: 'User Two', friendRequests: ['user-1'] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      await expect(friendService.sendFriendRequest('user-1', 'user-2'))
        .rejects.toThrow('好友请求已发送');
    });

    it('should create notification for recipient', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'Alice', friendRequests: [] },
        { id: 'user-2', username: 'Bob', friendRequests: [] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      await friendService.sendFriendRequest('user-1', 'user-2');

      expect(mockRepoInstance.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'friend_request',
          title: '新的好友请求'
        })
      );
    });
  });

  describe('acceptFriendRequest', () => {
    beforeEach(() => {
      mockRepoInstance.updateUser.mockImplementation(async (id, updates) => {
        const user = mockRepo.data.users.find(u => u.id === id);
        if (user) Object.assign(user, updates);
        return user;
      });
      mockRepoInstance.createNotification.mockImplementation(async (notification) => {
        mockRepo.data.notifications.push(notification);
        return notification;
      });
    });

    it('should accept friend request and add both users as friends', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'User One', friendRequests: ['user-2'], friends: [] },
        { id: 'user-2', username: 'User Two', friendRequests: [], friends: [] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      const result = await friendService.acceptFriendRequest('user-1', 'user-2');

      expect(result).toBe(true);
      expect(mockRepo.data.users[0].friends).toContain('user-2');
      expect(mockRepo.data.users[0].friendRequests).not.toContain('user-2');
      expect(mockRepo.data.users[1].friends).toContain('user-1');
    });

    it('should throw error if user does not exist', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await expect(friendService.acceptFriendRequest('nonexistent', 'user-2'))
        .rejects.toThrow('用户不存在');
    });

    it('should throw error if request does not exist', async () => {
      mockRepo.data.users = [{ id: 'user-1', friendRequests: [], friends: [] }];
      mockRepoInstance.userById.mockResolvedValue(mockRepo.data.users[0]);

      await expect(friendService.acceptFriendRequest('user-1', 'user-2'))
        .rejects.toThrow('好友请求不存在');
    });

    it('should create notification for requester', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'Alice', friendRequests: ['user-2'], friends: [] },
        { id: 'user-2', username: 'Bob', friendRequests: [], friends: [] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      await friendService.acceptFriendRequest('user-1', 'user-2');

      expect(mockRepoInstance.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'friend_accepted',
          title: '好友请求已通过'
        })
      );
    });
  });

  describe('rejectFriendRequest', () => {
    beforeEach(() => {
      mockRepoInstance.updateUser.mockImplementation(async (id, updates) => {
        const user = mockRepo.data.users.find(u => u.id === id);
        if (user) Object.assign(user, updates);
        return user;
      });
    });

    it('should remove request from friendRequests', async () => {
      mockRepo.data.users = [
        { id: 'user-1', friendRequests: ['user-2', 'user-3'], friends: [] }
      ];
      mockRepoInstance.userById.mockResolvedValue(mockRepo.data.users[0]);

      const result = await friendService.rejectFriendRequest('user-1', 'user-2');

      expect(result).toBe(true);
      expect(mockRepo.data.users[0].friendRequests).not.toContain('user-2');
      expect(mockRepo.data.users[0].friendRequests).toContain('user-3');
    });

    it('should throw error if user does not exist', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await expect(friendService.rejectFriendRequest('nonexistent', 'user-2'))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('removeFriend', () => {
    beforeEach(() => {
      mockRepoInstance.updateUser.mockImplementation(async (id, updates) => {
        const user = mockRepo.data.users.find(u => u.id === id);
        if (user) Object.assign(user, updates);
        return user;
      });
    });

    it('should remove friend from both users', async () => {
      mockRepo.data.users = [
        { id: 'user-1', friends: ['user-2'] },
        { id: 'user-2', friends: ['user-1'] }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      const result = await friendService.removeFriend('user-1', 'user-2');

      expect(result).toBe(true);
      expect(mockRepo.data.users[0].friends).not.toContain('user-2');
      expect(mockRepo.data.users[1].friends).not.toContain('user-1');
    });

    it('should throw error if user does not exist', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await expect(friendService.removeFriend('nonexistent', 'user-2'))
        .rejects.toThrow('用户不存在');
    });

    it('should throw error if not friends', async () => {
      mockRepo.data.users = [{ id: 'user-1', friends: [] }];
      mockRepoInstance.userById.mockResolvedValue(mockRepo.data.users[0]);

      await expect(friendService.removeFriend('user-1', 'user-2'))
        .rejects.toThrow('不是好友关系');
    });
  });

  describe('getFriends', () => {
    it('should return list of friend objects', async () => {
      mockRepo.data.users = [
        { id: 'user-1', friends: ['user-2', 'user-3'] },
        { id: 'user-2', username: 'Friend Two' },
        { id: 'user-3', username: 'Friend Three' }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      const result = await friendService.getFriends('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('Friend Two');
    });

    it('should throw error if user does not exist', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await expect(friendService.getFriends('nonexistent'))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('getFriendRequests', () => {
    it('should return list of requester objects', async () => {
      mockRepo.data.users = [
        { id: 'user-1', friendRequests: ['user-2', 'user-3'] },
        { id: 'user-2', username: 'Requester Two' },
        { id: 'user-3', username: 'Requester Three' }
      ];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });

      const result = await friendService.getFriendRequests('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('Requester Two');
    });
  });

  describe('createDirectMessage', () => {
    it('should create new DM if none exists', async () => {
      mockRepo.data.directMessages = [];
      mockRepoInstance.directMessages.mockResolvedValue([]);
      mockRepoInstance.createDirectMessage.mockImplementation(async (dm) => {
        mockRepo.data.directMessages.push(dm);
        return dm;
      });

      const result = await friendService.createDirectMessage(['user-1', 'user-2']);

      expect(result.participants).toEqual(['user-1', 'user-2']);
      expect(mockRepoInstance.createDirectMessage).toHaveBeenCalled();
    });

    it('should return existing DM if already exists', async () => {
      const existingDM = { id: 'dm-1', participants: ['user-1', 'user-2'] };
      mockRepoInstance.directMessages.mockResolvedValue([existingDM]);

      const result = await friendService.createDirectMessage(['user-1', 'user-2']);

      expect(result.id).toBe('dm-1');
      expect(mockRepoInstance.createDirectMessage).not.toHaveBeenCalled();
    });
  });

  describe('getDirectMessage', () => {
    it('should return DM by participants', async () => {
      const dm = { id: 'dm-1', participants: ['user-1', 'user-2'] };
      mockRepoInstance.directMessages.mockResolvedValue([dm]);

      const result = await friendService.getDirectMessage(['user-1', 'user-2']);

      expect(result.id).toBe('dm-1');
    });

    it('should return null if no DM exists', async () => {
      mockRepoInstance.directMessages.mockResolvedValue([]);

      const result = await friendService.getDirectMessage(['user-1', 'user-2']);

      expect(result).toBeNull();
    });
  });

  describe('getDirectMessageById', () => {
    it('should return DM by id', async () => {
      const dm = { id: 'dm-1', participants: ['user-1', 'user-2'] };
      mockRepoInstance.directMessageById.mockResolvedValue(dm);

      const result = await friendService.getDirectMessageById('dm-1');

      expect(result.id).toBe('dm-1');
    });
  });

  describe('sendDirectMessage', () => {
    beforeEach(() => {
      mockRepo.data.directMessages = [
        { id: 'dm-1', participants: ['user-1', 'user-2'], messages: [] }
      ];
      mockRepoInstance.directMessageById.mockImplementation(async (id) => {
        return mockRepo.data.directMessages.find(d => d.id === id) || null;
      });
      mockRepoInstance.updateDirectMessage.mockImplementation(async (id, updates) => {
        const dm = mockRepo.data.directMessages.find(d => d.id === id);
        if (dm) Object.assign(dm, updates);
        return dm;
      });
    });

    it('should send message to DM', async () => {
      const result = await friendService.sendDirectMessage('dm-1', {
        content: 'Hello!',
        authorId: 'user-1'
      });

      expect(result.content).toBe('Hello!');
      expect(result.authorId).toBe('user-1');
      expect(mockRepo.data.directMessages[0].messages).toHaveLength(1);
    });

    it('should throw error if DM does not exist', async () => {
      mockRepoInstance.directMessageById.mockResolvedValue(null);

      await expect(friendService.sendDirectMessage('nonexistent', {
        content: 'Hi',
        authorId: 'user-1'
      })).rejects.toThrow('对话不存在');
    });
  });

  describe('getDirectMessagesForUser', () => {
    it('should return all DMs for user', async () => {
      mockRepoInstance.queryAllDirectMessages = jest.fn(async () => [
        { id: 'dm-1', participants: ['user-1', 'user-2'] },
        { id: 'dm-2', participants: ['user-1', 'user-3'] },
        { id: 'dm-3', participants: ['user-2', 'user-3'] }
      ]);

      const result = await friendService.getDirectMessagesForUser('user-1');

      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual(['dm-1', 'dm-2']);
    });

    it('should return empty array if queryAllDirectMessages not implemented', async () => {
      delete mockRepoInstance.queryAllDirectMessages;

      const result = await friendService.getDirectMessagesForUser('user-1');

      expect(result).toEqual([]);
    });
  });
});