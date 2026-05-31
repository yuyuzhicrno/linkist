import { Router } from 'express';
import { getServices } from '../services-registry.js';
import { emitToUser } from '../services/socket.js';
import { getUser } from '../middleware/auth.js';

export const notificationsRouter = Router();

export async function createNotification(userId, type, title, message, data = {}) {
  const notification = await getServices().notification.createNotification(userId, type, title, message, data);
  emitToUser(userId, 'notification:new', notification);
  return notification;
}

notificationsRouter.get('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await getServices().notification.getNotifications(user.id, { limit: 50 });

    res.json(notifications);
  } catch (err) {
    console.error('获取通知错误:', err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

notificationsRouter.put('/:id/read', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await getServices().notification.markNotificationRead(req.params.id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('标记通知已读错误:', err);
    res.status(500).json({ error: '标记通知已读失败' });
  }
});

notificationsRouter.put('/read-all', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await getServices().notification.markAllNotificationsRead(user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('标记所有通知已读错误:', err);
    res.status(500).json({ error: '标记所有通知已读失败' });
  }
});

notificationsRouter.delete('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await getServices().repo.deleteNotification(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('删除通知错误:', err);
    res.status(500).json({ error: '删除通知失败' });
  }
});