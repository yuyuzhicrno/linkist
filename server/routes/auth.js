import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, safeUser, saveDatabase } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';

const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), JWT_SECRET);
    return db.data.users.find(u => u.id === userId) || null;
  } catch { return null; }
};

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: '请填写所有必填字段' });
  if (db.data.users.find(u => u.email === email))
    return res.status(409).json({ error: '该邮箱已被注册' });
  if (db.data.users.find(u => u.username === username))
    return res.status(409).json({ error: '该用户名已被使用' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    avatar: null,
    bio: '',
    role: 'member',
    createdAt: new Date().toISOString(),
    theme: 'dark',
    accentColor: '#7c3aed',
    uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
    isVerified: true
  };
  db.data.users.push(user);
  
  const general = db.data.channels.find(c => c.slug === 'general');
  if (general && !general.memberIds.includes(user.id)) {
    general.memberIds.push(user.id);
  }
  
  await saveDatabase();

  res.json({ success: true, message: '注册成功，现在可以登录了' });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: '邮箱或密码错误' });
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...safe } = user;
  res.json({ token, user: safe });
});

authRouter.get('/me', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});