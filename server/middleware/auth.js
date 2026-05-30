import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/index.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret());
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateWithUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret());
    req.userId = payload.userId;
    const { getServices } = await import('../services-registry.js');
    req.user = await getServices().user.getUserById(payload.userId);
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, getJwtSecret());
      req.userId = payload.userId;
      const { getServices } = await import('../services-registry.js');
      req.user = await getServices().user.getUserById(payload.userId);
    } catch {}
  }
  next();
};

export const signToken = (userId) => jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
