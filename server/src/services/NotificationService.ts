import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository/index.js';
import type { Notification } from '../types/index.js';

export class NotificationService {
  constructor(private repo: Repository) {}

  async getNotifications(userId: string, options: Record<string, unknown> = {}): Promise<Notification[]> {
    return await this.repo.notifications(userId, options);
  }

  async createNotification(userId: string, type: string, title: string, message: string, data: Record<string, unknown> = {}): Promise<Notification> {
    const notification: Omit<Notification, 'createdAt'> = {
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

  async markNotificationRead(id: string): Promise<Notification | null> {
    return await this.repo.markNotificationRead(id);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.repo.markAllNotificationsRead(userId);
  }

  async createPostNotification(postId: string, authorId: string, actorId: string, actorName: string, type: string): Promise<Notification | undefined> {
    const author = await this.repo.userById(authorId);
    if (!author || authorId === actorId) return;

    const titles: Record<string, string> = {
      comment: '新评论',
      reply: '新回复',
      upvote: '点赞',
      downvote: '点踩'
    };

    const messages: Record<string, string> = {
      comment: `${actorName} 评论了您的帖子`,
      reply: `${actorName} 回复了您`,
      upvote: `${actorName} 点赞了您的帖子`,
      downvote: `${actorName} 点踩了您的帖子`
    };

    return await this.createNotification(authorId, type, titles[type], messages[type], { postId, actorId });
  }
}