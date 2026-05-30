import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getServices } from '../services-registry.js';
import { validate, schemas, sanitizeInput } from '../middleware/validation.js';
import { getJwtSecret } from '../config/index.js';

export const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), getJwtSecret());
    return await getServices().user.getUserById(userId);
  } catch { return null; }
};

export const authRouter = Router();

authRouter.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);

    await getServices().user.createUser({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password
    });

    res.json({ success: true, message: '注册成功，现在可以登录了' });
  } catch (err) {
    if (err.message.includes('已被注册') || err.message.includes('已被使用')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('注册错误:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

authRouter.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const sanitizedEmail = sanitizeInput(email);

    const user = await getServices().user.verifyPassword(sanitizedEmail, password);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' });
    const { passwordHash: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

authRouter.get('/me', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});