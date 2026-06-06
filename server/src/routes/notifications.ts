import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { getUser } from '../middleware/auth';
import { emitToUser } from '../services/socket';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User } from '../types/index';

interface NotificationData {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsRouter = Router();

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown> = {}
): Promise<NotificationData> {
  const notification = await getServices().notification.createNotification(userId, type, title, message, data);
  emitToUser(userId, 'notification:new', notification);
  return notification;
}

notificationsRouter.get('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const notifications = await getServices().notification.getNotifications(user.id, { limit: 50 });

  res.json(notifications);
}));

notificationsRouter.put('/:id/read', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const notification = await getServices().notification.markNotificationRead(req.params.id as string);
  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true });
}));

notificationsRouter.put('/read-all', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().notification.markAllNotificationsRead(user.id);

  res.json({ success: true });
}));

notificationsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().repo.deleteNotification(req.params.id as string);
  res.json({ success: true });
}));