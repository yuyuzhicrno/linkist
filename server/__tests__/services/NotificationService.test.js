import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { NotificationService } from '../../dist/services/NotificationService.js';

describe('NotificationService', () => {
  let notificationService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    notificationService = new NotificationService(mockRepoInstance);

    mockRepo.data.notifications = [];
    mockRepo.data.users = [];
  });

  describe('getNotifications', () => {
    it('should return notifications from repo', async () => {
      mockRepo.data.notifications = [
        { id: '1', userId: 'user-1', title: 'Notification 1' },
        { id: '2', userId: 'user-1', title: 'Notification 2' }
      ];

      const result = await notificationService.getNotifications('user-1');

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.notifications).toHaveBeenCalledWith('user-1', {});
    });

    it('should pass options to repo', async () => {
      const options = { page: 1, limit: 10, unreadOnly: true };

      await notificationService.getNotifications('user-1', options);

      expect(mockRepoInstance.notifications).toHaveBeenCalledWith('user-1', options);
    });
  });

  describe('createNotification', () => {
    it('should create a notification with required fields', async () => {
      const notificationData = {
        userId: 'user-1',
        type: 'comment',
        title: '新评论',
        message: '有人评论了你的帖子'
      };

      const result = await notificationService.createNotification(
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.type).toBe('comment');
      expect(result.title).toBe('新评论');
      expect(mockRepoInstance.createNotification).toHaveBeenCalled();
    });

    it('should include data when provided', async () => {
      const data = { postId: 'post-1', actorId: 'actor-1' };

      const result = await notificationService.createNotification(
        'user-1',
        'comment',
        '新评论',
        '有人评论了你的帖子',
        data
      );

      expect(result.data).toEqual(data);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', async () => {
      const notification = { id: 'notification-1', isRead: false };
      mockRepoInstance.markNotificationRead.mockResolvedValue({ ...notification, isRead: true });

      const result = await notificationService.markNotificationRead('notification-1');

      expect(result.isRead).toBe(true);
      expect(mockRepoInstance.markNotificationRead).toHaveBeenCalledWith('notification-1');
    });

    it('should return null when notification not found', async () => {
      mockRepoInstance.markNotificationRead.mockResolvedValue(null);

      const result = await notificationService.markNotificationRead('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all user notifications as read', async () => {
      await notificationService.markAllNotificationsRead('user-1');

      expect(mockRepoInstance.markAllNotificationsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createPostNotification', () => {
    beforeEach(() => {
      mockRepo.data.users = [{ id: 'author-1', username: 'Author' }];
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });
    });

    it('should create notification for post author', async () => {
      mockRepoInstance.createNotification.mockResolvedValue({ id: 'notification-1' });

      await notificationService.createPostNotification('post-1', 'author-1', 'actor-1', 'Actor User', 'comment');

      expect(mockRepoInstance.createNotification).toHaveBeenCalled();
    });

    it('should not create notification when author not found', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await notificationService.createPostNotification('post-1', 'non-existent', 'actor-1', 'Actor User', 'comment');

      expect(mockRepoInstance.createNotification).not.toHaveBeenCalled();
    });

    it('should not create notification when author is the actor', async () => {
      await notificationService.createPostNotification('post-1', 'author-1', 'author-1', 'Author', 'comment');

      expect(mockRepoInstance.createNotification).not.toHaveBeenCalled();
    });

    it('should create correct notification type for comment', async () => {
      mockRepoInstance.createNotification.mockResolvedValue({ id: 'notification-1' });

      await notificationService.createPostNotification('post-1', 'author-1', 'actor-1', 'Actor User', 'comment');

      const call = mockRepoInstance.createNotification.mock.calls[0][0];
      expect(call.type).toBe('comment');
      expect(call.title).toBe('新评论');
    });

    it('should create correct notification type for reply', async () => {
      mockRepoInstance.createNotification.mockResolvedValue({ id: 'notification-1' });

      await notificationService.createPostNotification('post-1', 'author-1', 'actor-1', 'Actor User', 'reply');

      const call = mockRepoInstance.createNotification.mock.calls[0][0];
      expect(call.type).toBe('reply');
      expect(call.title).toBe('新回复');
    });

    it('should create correct notification type for upvote', async () => {
      mockRepoInstance.createNotification.mockResolvedValue({ id: 'notification-1' });

      await notificationService.createPostNotification('post-1', 'author-1', 'actor-1', 'Actor User', 'upvote');

      const call = mockRepoInstance.createNotification.mock.calls[0][0];
      expect(call.type).toBe('upvote');
      expect(call.title).toBe('点赞');
    });

    it('should create correct notification type for downvote', async () => {
      mockRepoInstance.createNotification.mockResolvedValue({ id: 'notification-1' });

      await notificationService.createPostNotification('post-1', 'author-1', 'actor-1', 'Actor User', 'downvote');

      const call = mockRepoInstance.createNotification.mock.calls[0][0];
      expect(call.type).toBe('downvote');
      expect(call.title).toBe('点踩');
    });
  });
});