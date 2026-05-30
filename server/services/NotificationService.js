import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  constructor(repo) {
    this.repo = repo;
  }

  async getNotifications(userId, options = {}) {
    return await this.repo.notifications(userId, options);
  }

  async createNotification(userId, type, title, message, data = {}) {
    const notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      isRead: false
    };

    return await this.repo.createNotification(notification);
  }

  async markNotificationRead(id) {
    return await this.repo.markNotificationRead(id);
  }

  async markAllNotificationsRead(userId) {
    await this.repo.markAllNotificationsRead(userId);
  }

  async createPostNotification(postId, authorId, actorId, actorName, type) {
    const author = await this.repo.userById(authorId);
    if (!author || authorId === actorId) return;

    const titles = {
      comment: '新评论',
      reply: '新回复',
      upvote: '点赞',
      downvote: '点踩'
    };

    const messages = {
      comment: `${actorName} 评论了您的帖子`,
      reply: `${actorName} 回复了您`,
      upvote: `${actorName} 点赞了您的帖子`,
      downvote: `${actorName} 点踩了您的帖子`
    };

    return await this.createNotification(authorId, type, titles[type], messages[type], { postId, actorId });
  }
}