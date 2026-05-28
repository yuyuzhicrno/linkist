import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db, safeUser, saveDatabase } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal_pass'
  }
});

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

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
  const verificationToken = generateVerificationToken();
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
    isVerified: false,
    verificationToken,
    verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000
  };
  db.data.users.push(user);
  
  const general = db.data.channels.find(c => c.slug === 'general');
  if (general && !general.memberIds.includes(user.id)) {
    general.memberIds.push(user.id);
  }
  
  await saveDatabase();

  const verifyUrl = `${BASE_URL}/verify-email?token=${verificationToken}`;
  
  try {
    await transporter.sendMail({
      from: 'no-reply@linkist.app',
      to: email,
      subject: '验证你的邮箱地址',
      html: `<p>欢迎加入 Linkist！请点击下方链接验证你的邮箱：</p>
             <p><a href="${verifyUrl}">${verifyUrl}</a></p>
             <p>该链接将在24小时内过期。</p>`
    });
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }

  res.json({ success: true, message: '注册成功，请检查邮箱验证链接' });
});

authRouter.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: '验证令牌缺失' });

  const user = db.data.users.find(u => u.verificationToken === token);
  if (!user) return res.status(404).json({ error: '无效的验证令牌' });
  if (user.verificationTokenExpires < Date.now()) return res.status(400).json({ error: '验证令牌已过期' });

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await saveDatabase();

  res.json({ success: true, message: '邮箱验证成功，现在可以登录了' });
});

authRouter.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '请提供邮箱地址' });

  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: '该邮箱未注册' });
  if (user.isVerified) return res.status(400).json({ error: '该邮箱已验证' });

  user.verificationToken = generateVerificationToken();
  user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  await saveDatabase();

  const verifyUrl = `${BASE_URL}/verify-email?token=${user.verificationToken}`;

  try {
    await transporter.sendMail({
      from: 'no-reply@linkist.app',
      to: email,
      subject: '验证你的邮箱地址',
      html: `<p>请点击下方链接验证你的邮箱：</p>
             <p><a href="${verifyUrl}">${verifyUrl}</a></p>
             <p>该链接将在24小时内过期。</p>`
    });
    res.json({ success: true, message: '验证邮件已发送，请检查邮箱' });
  } catch (err) {
    console.error('Failed to send verification email:', err);
    res.status(500).json({ error: '发送邮件失败，请稍后重试' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });
  if (user.isVerified === false) return res.status(401).json({ error: '请先验证邮箱地址' });
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