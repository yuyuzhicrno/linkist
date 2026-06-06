import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getServices } from '../services-registry';
import { validate, schemas, sanitizeInput } from '../middleware/validation';
import { getJwtSecret } from '../config/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User } from '../types/index';

interface JwtPayload {
  userId: string;
}

export const getUser = async (req: Request): Promise<User | null> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), getJwtSecret()) as JwtPayload;
    return await getServices().user.getUserById(payload.userId);
  } catch { return null; }
};

export const authRouter = Router();

authRouter.post('/register', validate(schemas.register), asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { username, email, password } = req.body as { username: string; email: string; password: string };
  const sanitizedUsername = sanitizeInput(username) || '';
  const sanitizedEmail = sanitizeInput(email) || '';

  await getServices().user.createUser({
    username: sanitizedUsername,
    email: sanitizedEmail,
    password
  });

  res.json({ success: true, message: '注册成功，现在可以登录了' });
}));

authRouter.post('/login', validate(schemas.login), asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { email, password } = req.body as { email: string; password: string };
  const sanitizedEmail = sanitizeInput(email) || '';

  const user = await getServices().user.verifyPassword(sanitizedEmail, password);
  if (!user) {
    throw new AppError('邮箱或密码错误', 401, 'UNAUTHORIZED');
  }

  const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' });
  const { passwordHash: _, ...safe } = user;
  res.json({ token, user: safe });
}));

authRouter.get('/me', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req);
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
}));