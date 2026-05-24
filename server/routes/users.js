import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db, safeUser, addXp, calcLevel, CHANNEL_CREATE_LEVEL } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const usersRouter = Router();

// GET current user profile (/me must be before /:id)
usersRouter.get('/me', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, levelInfo: calcLevel(user.xp || 0) });
});

// GET user profile by id or username
usersRouter.get('/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const safe = safeUser(user);
  const posts = db.posts.filter(p => p.authorId === user.id).map(p => ({
    id: p.id, title: p.title, category: p.category,
    voteCount: p.upvotes.length - p.downvotes.length,
    commentCount: p.comments.length, createdAt: p.createdAt
  }));
  const columns = db.columns.filter(c => c.authorId === user.id).map(c => ({
    id: c.id, title: c.title, articleCount: c.articles.length, followers: c.followers.length
  }));
  res.json({
    ...safe,
    levelInfo: calcLevel(user.xp || 0),
    canCreateChannel: calcLevel(user.xp || 0).level >= CHANNEL_CREATE_LEVEL,
    stats: { posts: posts.length, columns: columns.length, friends: (user.friends || []).length },
    posts,
    columns
  });
});

// PUT update profile (bio, accentColor, theme, uiSettings)
usersRouter.put('/me', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { bio, theme, accentColor, uiSettings } = req.body;
  if (bio !== undefined) user.bio = bio;
  if (theme !== undefined) user.theme = theme;
  if (accentColor !== undefined) user.accentColor = accentColor;
  if (uiSettings !== undefined) user.uiSettings = { ...user.uiSettings, ...uiSettings };
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, levelInfo: calcLevel(user.xp || 0) });
});

// POST upload avatar (base64 image)
usersRouter.post('/me/avatar', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { dataUrl } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image data' });
  }
  // Limit size to ~2MB base64
  if (dataUrl.length > 2 * 1024 * 1024 * 1.37) {
    return res.status(400).json({ error: 'Image too large (max 2MB)' });
  }
  user.avatar = dataUrl;
  // +10 XP for setting avatar (only once)
  if (!user._avatarXpGiven) { addXp(user.id, 10); user._avatarXpGiven = true; }
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, levelInfo: calcLevel(user.xp || 0) });
});

// GET search users
usersRouter.get('/', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const results = db.users
    .filter(u => u.username.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10)
    .map(u => safeUser(u));
  res.json(results);
});

// POST add XP (admin only or internal calls)
usersRouter.post('/:id/xp', (req, res) => {
  const caller = getUser(req);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { amount } = req.body;
  addXp(req.params.id, Number(amount) || 0);
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ xp: user.xp, levelInfo: calcLevel(user.xp) });
});
