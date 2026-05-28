import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, calcLevel, CHANNEL_CREATE_LEVEL, addXp, flushDatabase } from '../data/db.js';
import { emitToChannel } from '../services/socket.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.data.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const channelsRouter = Router();

// GET all channels (public)
channelsRouter.get('/', (req, res) => {
  const user = getUser(req);
  const channels = db.data.channels
    .filter(c => c.isPublic || (user && c.memberIds.includes(user.id)))
    .map(({ messages, ...c }) => ({ ...c, messageCount: messages.length, lastMessage: messages[messages.length - 1] || null }));
  res.json(channels);
});

// GET single channel with messages
channelsRouter.get('/:id', (req, res) => {
  const ch = db.data.channels.find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const messages = ch.messages.map(m => ({
    ...m,
    author: (() => { const u = db.data.users.find(x => x.id === m.authorId); return u ? { id: u.id, username: u.username, avatar: u.avatar } : null; })()
  }));
  res.json({ ...ch, messages });
});

// POST create channel (requires level >= CHANNEL_CREATE_LEVEL)
channelsRouter.post('/', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { level } = calcLevel(user.xp || 0);
  if (level < CHANNEL_CREATE_LEVEL && user.role !== 'admin')
    return res.status(403).json({ error: `需要达到 ${CHANNEL_CREATE_LEVEL} 级才能创建频道（当前 ${level} 级）` });
  const { name, description, icon, color, isPublic } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const channel = {
    id: uuidv4(), name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    description: description || '',
    icon: icon || '💬', color: color || '#7c3aed',
    isPublic: isPublic !== false,
    memberIds: [user.id], ownerId: user.id,
    createdAt: new Date().toISOString(), messages: []
  };
  db.data.channels.push(channel);
  addXp(user.id, 20);
  flushDatabase();
  res.json(channel);
});

// POST join channel
channelsRouter.post('/:id/join', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const ch = db.data.channels.find(c => c.id === req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  if (!ch.memberIds.includes(user.id)) ch.memberIds.push(user.id);
  flushDatabase();
  res.json({ success: true });
});

// POST send message
channelsRouter.post('/:id/messages', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const ch = db.data.channels.find(c => c.id === req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const msg = { id: uuidv4(), authorId: user.id, content: content.trim(), createdAt: new Date().toISOString(), reactions: {} };
  ch.messages.push(msg);
  flushDatabase();
  const msgWithAuthor = { ...msg, author: { id: user.id, username: user.username, avatar: user.avatar } };
  emitToChannel(ch.id, 'message:new', msgWithAuthor);
  res.json(msgWithAuthor);
});

// POST react to message
channelsRouter.post('/:channelId/messages/:msgId/react', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const ch = db.data.channels.find(c => c.id === req.params.channelId);
  const msg = ch?.messages.find(m => m.id === req.params.msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const { emoji } = req.body;
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(user.id);
  if (idx === -1) msg.reactions[emoji].push(user.id);
  else msg.reactions[emoji].splice(idx, 1);
  flushDatabase();
  emitToChannel(ch.id, 'message:reaction', { messageId: msg.id, reactions: msg.reactions });
  res.json(msg.reactions);
});
