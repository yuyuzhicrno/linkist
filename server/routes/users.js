import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServices } from '../services-registry.js';
import { authenticateWithUser } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId || 'anonymous'}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

const safeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
};

export const usersRouter = Router();

usersRouter.get('/me', authenticateWithUser, async (req, res) => {
  try {
    res.json({ ...safeUser(req.user), levelInfo: getServices().user.calcLevel(req.user.xp || 0) });
  } catch (err) {
    logger.error('获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await getServices().user.getUserById(req.params.id);
    const userByUsername = user || await getServices().user.getUserByUsername(req.params.id);
    
    if (!userByUsername) return res.status(404).json({ error: 'User not found' });
    
    const posts = await getServices().repo.posts({ authorId: userByUsername.id });
    const postStats = posts.posts.map(p => ({
      id: p.id, title: p.title, category: p.category,
      voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0),
      commentCount: (p.comments?.length || 0), createdAt: p.createdAt
    }));
    
    res.json({
      ...safeUser(userByUsername),
      levelInfo: getServices().user.calcLevel(userByUsername.xp || 0),
      stats: { posts: postStats.length, friends: (userByUsername.friends || []).length },
      posts: postStats
    });
  } catch (err) {
    logger.error('获取用户资料错误:', err);
    res.status(500).json({ error: '获取用户资料失败' });
  }
});

usersRouter.put('/me', authenticateWithUser, async (req, res) => {
  try {
    const { bio, theme, accentColor, uiSettings } = req.body;
    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (theme !== undefined) updates.theme = theme;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (uiSettings !== undefined) updates.uiSettings = { ...req.user.uiSettings, ...uiSettings };
    
    const updated = await getServices().user.updateUser(req.user.id, updates);
    res.json({ ...safeUser(updated), levelInfo: getServices().user.calcLevel(updated.xp || 0) });
  } catch (err) {
    logger.error('更新用户资料错误:', err);
    res.status(500).json({ error: '更新用户资料失败' });
  }
});

usersRouter.post('/me/avatar', authenticateWithUser, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    
    await getServices().user.updateUser(req.user.id, { avatar: avatarUrl });
    
    if (!req.user._avatarXpGiven) {
      await getServices().user.addXp(req.user.id, 10);
      await getServices().user.updateUser(req.user.id, { _avatarXpGiven: true });
    }
    
    const updated = await getServices().user.getUserById(req.user.id);
    res.json({ ...safeUser(updated), levelInfo: getServices().user.calcLevel(updated.xp || 0) });
  } catch (err) {
    logger.error('上传头像错误:', err);
    res.status(500).json({ error: '上传头像失败' });
  }
});

usersRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const users = await getServices().user.getAllUsers();
    const results = users
      .filter(u => u.username.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10)
      .map(safeUser);
    
    res.json(results);
  } catch (err) {
    logger.error('搜索用户错误:', err);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

usersRouter.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    
    const users = await getServices().user.getAllUsers();
    const results = users
      .filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map(safeUser);
    
    res.json(results);
  } catch (err) {
    logger.error('搜索用户错误:', err);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

usersRouter.post('/:id/xp', authenticateWithUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const { amount } = req.body;
    await getServices().user.addXp(req.params.id, Number(amount) || 0);
    
    const user = await getServices().user.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    res.json({ xp: user.xp, levelInfo: getServices().user.calcLevel(user.xp) });
  } catch (err) {
    logger.error('添加经验值错误:', err);
    res.status(500).json({ error: '添加经验值失败' });
  }
});