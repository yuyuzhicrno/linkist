import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServices } from '../services-registry';
import { authenticateWithUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User, Post } from '../types/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

interface SafeUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string;
  role: 'member' | 'admin';
  xp: number;
  theme: string;
  accentColor: string;
  uiSettings: {
    fontSize: 'sm' | 'base' | 'lg';
    compactMode: boolean;
    sidebarCollapsed: boolean;
  };
  friends: string[];
  friendRequests: string[];
  isVerified: boolean;
  createdAt: string;
}

const avatarStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    const userId = (req as AuthRequest).userId || 'anonymous';
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

const safeUser = (user: User | null): SafeUser | null => {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe as SafeUser;
};

export const usersRouter = Router();

usersRouter.get('/me', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  res.json({ ...safeUser(authReq.user!), levelInfo: getServices().user.calcLevel(authReq.user?.xp || 0) });
}));

usersRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params.id as string;
  const user = await getServices().user.getUserById(id);
  const userByUsername = user || await getServices().user.getUserByUsername(id);

  if (!userByUsername) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const posts = await getServices().repo.posts({ authorId: userByUsername.id });
  const postList = Array.isArray(posts) ? posts : posts.posts;
  const postStats = postList.map((p: Post) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0),
    commentCount: p.commentCount || 0,
    createdAt: p.createdAt
  }));

  res.json({
    ...safeUser(userByUsername),
    levelInfo: getServices().user.calcLevel(userByUsername.xp || 0),
    stats: { posts: postStats.length, friends: (userByUsername.friends || []).length },
    posts: postStats
  });
}));

usersRouter.put('/me', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { bio, theme, accentColor, uiSettings } = req.body as {
    bio?: string;
    theme?: string;
    accentColor?: string;
    uiSettings?: Partial<User['uiSettings']>;
  };
  const updates: Partial<User> = {};
  if (bio !== undefined) updates.bio = bio;
  if (theme !== undefined) updates.theme = theme;
  if (accentColor !== undefined) updates.accentColor = accentColor;
  if (uiSettings !== undefined) updates.uiSettings = { ...authReq.user!.uiSettings, ...uiSettings };

  const updated = await getServices().user.updateUser(authReq.user!.id, updates);
  res.json({ ...safeUser(updated), levelInfo: getServices().user.calcLevel(updated?.xp || 0) });
}));

usersRouter.post('/me/avatar', authenticateWithUser, avatarUpload.single('avatar'), asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.file) {
    throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
  }

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const avatarUrl = `${baseUrl}/uploads/avatars/${authReq.file.filename}`;

  await getServices().user.updateUser(authReq.user!.id, { avatar: avatarUrl });

  const user = await getServices().user.getUserById(authReq.user!.id);
  if (user) {
    await getServices().user.addXp(authReq.user!.id, 10);
  }

  const updated = await getServices().user.getUserById(authReq.user!.id);
  res.json({ ...safeUser(updated), levelInfo: getServices().user.calcLevel(updated?.xp || 0) });
}));

usersRouter.get('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { q } = req.query as { q?: string };
  if (!q) {
    res.json([]);
    return;
  }

  const users = await getServices().user.getAllUsers();
  const results = users
    .filter(u => u.username.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10)
    .map(safeUser);

  res.json(results);
}));

usersRouter.get('/search', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { query } = req.query as { query?: string };
  if (!query) {
    res.json([]);
    return;
  }

  const users = await getServices().user.getAllUsers();
  const results = users
    .filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)
    .map(safeUser);

  res.json(results);
}));

usersRouter.post('/:id/xp', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (authReq.user?.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const { amount } = req.body as { amount: number };
  const userId = req.params.id as string;
  await getServices().user.addXp(userId, Number(amount) || 0);

  const user = await getServices().user.getUserById(userId);
  if (!user) {
    throw new AppError('Not found', 404, 'NOT_FOUND');
  }

  res.json({ xp: user.xp, levelInfo: getServices().user.calcLevel(user.xp) });
}));