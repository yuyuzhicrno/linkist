// Friends & Direct Messages router
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, safeUser, addXp, flushDatabase, recordDbOp } from '../data/db.js';
import { emitDmToParticipants } from '../services/socket.js';
import { createNotification } from './notifications.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.data.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const friendsRouter = Router();

// ─── Friend Requests ──────────────────────────────────────────────

// GET my friends list
friendsRouter.get('/', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const friends = (me.friends || []).map(fid => safeUser(db.data.users.find(u => u.id === fid))).filter(Boolean);
  const requests = (me.friendRequests || []).map(rid => safeUser(db.data.users.find(u => u.id === rid))).filter(Boolean);
  res.json({ friends, requests });
});

// POST send friend request
friendsRouter.post('/request/:targetId', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const target = db.data.users.find(u => u.id === req.params.targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (me.id === target.id) return res.status(400).json({ error: 'Cannot add yourself' });
  if ((me.friends || []).includes(target.id)) return res.status(400).json({ error: 'Already friends' });
  target.friendRequests = target.friendRequests || [];
  if (!target.friendRequests.includes(me.id)) target.friendRequests.push(me.id);
  createNotification(target.id, 'friend_request', '收到好友申请', `用户 ${me.username} 向你发送了好友申请`, { fromUserId: me.id });
  flushDatabase();
  res.json({ success: true });
});

// POST accept friend request
friendsRouter.post('/accept/:requesterId', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const requester = db.data.users.find(u => u.id === req.params.requesterId);
  if (!requester) return res.status(404).json({ error: 'User not found' });
  me.friendRequests = (me.friendRequests || []).filter(id => id !== requester.id);
  me.friends = me.friends || [];
  requester.friends = requester.friends || [];
  if (!me.friends.includes(requester.id)) me.friends.push(requester.id);
  if (!requester.friends.includes(me.id)) requester.friends.push(me.id);
  addXp(me.id, 5);
  addXp(requester.id, 5);
  createNotification(requester.id, 'friend_accepted', '好友申请已通过', `用户 ${me.username} 同意了你的好友申请`, { fromUserId: me.id });
  flushDatabase();
  res.json({ success: true });
});

// POST decline/remove friend
friendsRouter.delete('/remove/:otherId', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const other = db.data.users.find(u => u.id === req.params.otherId);
  me.friends = (me.friends || []).filter(id => id !== req.params.otherId);
  me.friendRequests = (me.friendRequests || []).filter(id => id !== req.params.otherId);
  if (other) {
    other.friends = (other.friends || []).filter(id => id !== me.id);
    other.friendRequests = (other.friendRequests || []).filter(id => id !== me.id);
  }
  flushDatabase();
  res.json({ success: true });
});

// ─── Direct Messages ──────────────────────────────────────────────

// GET my DM conversations
friendsRouter.get('/dms', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const convos = db.data.directMessages
    .filter(dm => dm.participants.includes(me.id))
    .map(dm => {
      const otherId = dm.participants.find(id => id !== me.id);
      const other = safeUser(db.data.users.find(u => u.id === otherId));
      const lastMsg = dm.messages[dm.messages.length - 1] || null;
      const unread = dm.messages.filter(m => m.senderId !== me.id && !m.read).length;
      return { id: dm.id, other, lastMessage: lastMsg, unread };
    });
  res.json(convos);
});

// GET specific DM conversation with a user
friendsRouter.get('/dms/:userId', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const otherId = req.params.userId;
  let convo = db.data.directMessages.find(dm =>
    dm.participants.includes(me.id) && dm.participants.includes(otherId)
  );
  if (!convo) {
    convo = { id: uuidv4(), participants: [me.id, otherId], messages: [] };
    db.data.directMessages.push(convo);
  }
  // Mark as read
  convo.messages.forEach(m => { if (m.senderId !== me.id) m.read = true; });
  const other = safeUser(db.data.users.find(u => u.id === otherId));
  const messages = convo.messages.map(m => {
    const sender = db.data.users.find(u => u.id === m.senderId);
    return { ...m, sender: sender ? { id: sender.id, username: sender.username, avatar: sender.avatar } : null };
  });
  res.json({ id: convo.id, other, messages });
});

// POST send DM
friendsRouter.post('/dms/:userId', (req, res) => {
  const me = getUser(req);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const otherId = req.params.userId;
  const other = db.data.users.find(u => u.id === otherId);
  if (!other) return res.status(404).json({ error: 'User not found' });
  let convo = db.data.directMessages.find(dm =>
    dm.participants.includes(me.id) && dm.participants.includes(otherId)
  );
  if (!convo) {
    convo = { id: uuidv4(), participants: [me.id, otherId], messages: [] };
    db.data.directMessages.push(convo);
    recordDbOp('insert', 'directMessages', convo.id, convo);
  }
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const msg = {
    id: uuidv4(),
    senderId: me.id,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };
  convo.messages.push(msg);
  recordDbOp('update', 'directMessages', convo.id);
  addXp(me.id, 1);
  flushDatabase();
  const msgWithSender = { ...msg, sender: { id: me.id, username: me.username, avatar: me.avatar } };
  emitDmToParticipants(convo, 'dm:message:new', { convoId: convo.id, message: msgWithSender });
  res.json(msgWithSender);
});
