import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, flushDatabase, recordDbOp } from '../data/db.js';
import { emitToUser } from '../services/socket.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.data.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const notificationsRouter = Router();

export function createNotification(userId, type, title, message, data = {}) {
  const notification = {
    id: uuidv4(),
    userId,
    type,
    title,
    message,
    data,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  if (db.data?.notifications) {
    db.data.notifications.unshift(notification);
    recordDbOp('insert', 'notifications', notification.id, notification);
    flushDatabase();
  }

  emitToUser(userId, 'notification:new', notification);

  return notification;
}

notificationsRouter.get('/', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const notifications = db.data.notifications
    .filter(n => n.userId === user.id)
    .slice(0, 50);

  res.json(notifications);
});

notificationsRouter.put('/:id/read', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const notification = db.data.notifications.find(n => n.id === req.params.id && n.userId === user.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  notification.isRead = true;
  res.json({ success: true });
});

notificationsRouter.put('/read-all', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  db.data.notifications
    .filter(n => n.userId === user.id)
    .forEach(n => { n.isRead = true; });

  res.json({ success: true });
});

notificationsRouter.delete('/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const idx = db.data.notifications.findIndex(n => n.id === req.params.id && n.userId === user.id);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });

  db.data.notifications.splice(idx, 1);
  res.json({ success: true });
});