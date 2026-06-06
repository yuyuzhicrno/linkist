import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getJwtSecret } from '../config/index';
import type { User } from '../types/index';

interface JwtPayload {
  userId: string;
}

interface AuthRequest extends Request {
  userId?: string;
  user?: User | null;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateWithUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.userId = payload.userId;
    const { getServices } = await import('../services-registry');
    req.user = await getServices().user.getUserById(payload.userId);
    if (!req.user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.userId = payload.userId;
      const { getServices } = await import('../services-registry');
      req.user = await getServices().user.getUserById(payload.userId);
    } catch {}
  }
  next();
};

export const signToken = (userId: string): string =>
  jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });

export const getUser = async (req: Request): Promise<User | null> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), getJwtSecret()) as JwtPayload;
    const { getServices } = await import('../services-registry');
    return await getServices().user.getUserById(userId);
  } catch {
    return null;
  }
};