import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { getUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { Debate, DebateArgument, User } from '../types/index';

export const debatesRouter = Router();

debatesRouter.get('/', asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  const result = await getServices().debate.getDebates();
  res.json(result);
}));

debatesRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const debate = await getServices().debate.getDebateById(req.params.id as string);
  if (!debate) {
    throw new AppError('争辩帖不存在', 404, 'NOT_FOUND');
  }
  res.json(debate);
}));

debatesRouter.get('/:id/arguments', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const argumentsList = await getServices().debate.getDebateArguments(req.params.id as string);
  res.json(argumentsList);
}));

debatesRouter.get('/:id/vote', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req);
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const vote = await getServices().debate.getUserDebateVote(req.params.id as string, user.id);
  res.json(vote || null);
}));

debatesRouter.post('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const body = req.body as {
    proposition?: string;
    expiresAt?: string;
    postId?: string;
  };

  if (!body.proposition) {
    throw new AppError('命题内容不能为空', 400, 'VALIDATION_ERROR');
  }

  if (!body.expiresAt) {
    throw new AppError('截止时间不能为空', 400, 'VALIDATION_ERROR');
  }

  const debate = await getServices().debate.createDebate({
    proposition: body.proposition,
    authorId: user.id,
    postId: body.postId,
    expiresAt: body.expiresAt
  });

  await getServices().user.addXp(user.id, 10);

  res.json(debate);
}));

debatesRouter.post('/:id/argument', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const body = req.body as {
    side?: 'pro' | 'con';
    content?: string;
    replyToId?: string;
  };

  if (!body.side || !['pro', 'con'].includes(body.side)) {
    throw new AppError('必须选择支持或反对', 400, 'VALIDATION_ERROR');
  }

  if (!body.content) {
    throw new AppError('论点内容不能为空', 400, 'VALIDATION_ERROR');
  }

  const argument = await getServices().debate.addArgument({
    debateId: req.params.id as string,
    authorId: user.id,
    side: body.side,
    content: body.content,
    replyToId: body.replyToId
  });

  await getServices().user.addXp(user.id, 5);

  res.json(argument);
}));

debatesRouter.post('/:id/vote', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const body = req.body as {
    side?: 'pro' | 'con';
  };

  if (!body.side || !['pro', 'con'].includes(body.side)) {
    throw new AppError('必须选择支持或反对', 400, 'VALIDATION_ERROR');
  }

  const debate = await getServices().debate.voteDebate({
    debateId: req.params.id as string,
    userId: user.id,
    side: body.side
  });

  res.json(debate);
}));

debatesRouter.post('/:id/resolve', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const debate = await getServices().debate.getDebateById(req.params.id as string);
  if (!debate) {
    throw new AppError('争辩帖不存在', 404, 'NOT_FOUND');
  }

  if (debate.authorId !== user.id && user.role !== 'admin') {
    throw new AppError('没有权限结束此争辩帖', 403, 'FORBIDDEN');
  }

  const resolvedDebate = await getServices().debate.resolveDebate(req.params.id as string);
  res.json(resolvedDebate);
}));