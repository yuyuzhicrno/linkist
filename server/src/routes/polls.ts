import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { getUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User } from '../types/index';

export const pollsRouter = Router();

pollsRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const poll = await getServices().poll.getPollById(req.params.id as string);
  if (!poll) {
    throw new AppError('Poll not found', 404, 'NOT_FOUND');
  }
  res.json(poll);
}));

pollsRouter.get('/post/:postId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const poll = await getServices().poll.getPollsForPost(req.params.postId as string);
  res.json(poll || null);
}));

pollsRouter.post('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const body = req.body as {
    question?: string;
    options?: string[];
    allowMultiple?: boolean;
    endsAt?: string;
    postId?: string;
  };
  if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
    throw new AppError('Question and at least 2 options required', 400, 'VALIDATION_ERROR');
  }

  const poll = await getServices().poll.createPoll({
    question: body.question,
    options: body.options,
    authorId: user.id,
    postId: body.postId || '',
    expiresAt: body.endsAt,
    allowMultiple: body.allowMultiple
  });

  if (body.postId) {
    await getServices().post.updatePost(body.postId, { pollId: poll.id });
  }

  await getServices().user.addXp(user.id, 5);

  res.json(poll);
}));

pollsRouter.post('/:id/vote', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { optionIds } = req.body as { optionIds?: string[] };
  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    throw new AppError('optionIds required', 400, 'VALIDATION_ERROR');
  }

  const poll = await getServices().poll.votePoll(req.params.id as string, user.id, optionIds);

  await getServices().user.addXp(user.id, 2);

  res.json(poll);
}));

pollsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().poll.deletePoll(req.params.id as string, user.id, user.role);

  res.json({ success: true });
}));