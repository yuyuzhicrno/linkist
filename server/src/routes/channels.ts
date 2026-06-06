import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { emitToChannel } from '../services/socket';
import { validate, schemas, sanitizeInput } from '../middleware/validation';
import { authenticateWithUser, optionalAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User, Channel, ChannelMessage } from '../types/index';

interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

interface Author {
  id: string;
  username: string;
  avatar: string | null;
}

interface EnrichedChannel extends Channel {
  lastMessage: ChannelMessage | null;
}

const getAuthor = async (authorId: string): Promise<Author | null> => {
  const u = await getServices().user.getUserById(authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar };
};

export const channelsRouter = Router();

channelsRouter.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const channels = await getServices().channel.getChannels();
  const repo = getServices().repo;

  const filteredChannels = channels.filter(c =>
    c.isPublic || ((req as AuthRequest).user && c.memberIds?.includes((req as AuthRequest).user!.id))
  );

  const enrichedChannels = await Promise.all(filteredChannels.map(async (ch: Channel) => {
    const messages = await repo.channelMessages(ch.id, { limit: 1, offset: 0 });
    return {
      ...ch,
      messageCount: ch.messageCount || 0,
      lastMessage: messages.length > 0 ? messages[0] : null
    } as EnrichedChannel;
  }));

  res.json(enrichedChannels);
}));

channelsRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const repo = getServices().repo;
  let ch = await getServices().channel.getChannelById(req.params.id as string);
  if (!ch) {
    ch = await getServices().channel.getChannelBySlug(req.params.id as string);
    if (!ch) {
      throw new AppError('Channel not found', 404, 'NOT_FOUND');
    }
  }

  const messages = await repo.channelMessages(ch.id);

  const messagesWithAuthors = await Promise.all(messages.map(async (m: ChannelMessage) => ({
    ...m,
    author: await getAuthor(m.authorId)
  })));

  res.json({ ...ch, messages: messagesWithAuthors });
}));

channelsRouter.post('/', validate(schemas.createChannel), authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { level } = getServices().user.calcLevel(authReq.user!.xp || 0);
  const CHANNEL_CREATE_LEVEL = 3;
  if (level < CHANNEL_CREATE_LEVEL && authReq.user!.role !== 'admin') {
    throw new AppError(`需要达到 ${CHANNEL_CREATE_LEVEL} 级才能创建频道（当前 ${level} 级）`, 403, 'FORBIDDEN');
  }

  const { name, description, icon, color, isPublic } = req.body as {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isPublic?: boolean;
  };

  const channel = await getServices().channel.createChannel({
    name: sanitizeInput(name) || '',
    description: sanitizeInput(description || '') || '',
    icon: sanitizeInput(icon || '') || '💬',
    color: sanitizeInput(color || '') || '#7c3aed',
    isPublic: isPublic !== false,
    ownerId: authReq.user!.id
  });

  await getServices().user.addXp(authReq.user!.id, 20);

  res.json(channel);
}));

channelsRouter.post('/:id/join', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  await getServices().channel.joinChannel(req.params.id as string, authReq.user!.id);
  res.json({ success: true });
}));

channelsRouter.post('/:id/read', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { lastReadMessageId } = req.body as { lastReadMessageId: string };
  await getServices().channel.markChannelRead(req.params.id as string, authReq.user!.id, lastReadMessageId);
  res.json({ success: true });
}));

channelsRouter.post('/:id/messages', validate(schemas.sendMessage), authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { content } = req.body as { content: string };
  const msg = await getServices().channel.sendMessage(req.params.id as string, {
    content: (sanitizeInput(content) || '').trim(),
    authorId: authReq.user!.id
  });

  const msgWithAuthor = {
    ...msg,
    author: { id: authReq.user!.id, username: authReq.user!.username, avatar: authReq.user!.avatar }
  };
  emitToChannel(req.params.id as string, 'message:new', msgWithAuthor);

  res.json(msgWithAuthor);
}));

channelsRouter.post('/:channelId/messages/:msgId/react', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { emoji } = req.body as { emoji: string };
  const reactions = await getServices().channel.addReaction(
    req.params.channelId as string,
    req.params.msgId as string,
    emoji,
    authReq.user!.id
  );

  emitToChannel(req.params.channelId as string, 'message:reaction', { messageId: req.params.msgId, reactions });

  res.json(reactions);
}));

channelsRouter.get('/:id/members', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const channel = await getServices().channel.getChannelById(req.params.id as string);
  if (!channel) {
    throw new AppError('频道不存在', 404, 'NOT_FOUND');
  }

  if (!channel.isPublic && !channel.memberIds?.includes(authReq.user!.id) && channel.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
    throw new AppError('无权访问此频道', 403, 'FORBIDDEN');
  }

  const members = await Promise.all((channel.memberIds || []).map(async (id: string) => {
    const u = await getServices().user.getUserById(id);
    return u ? { id: u.id, username: u.username, avatar: u.avatar } : null;
  }));

  res.json(members.filter(Boolean));
}));

channelsRouter.post('/:id/members', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const channel = await getServices().channel.getChannelById(req.params.id as string);
  if (!channel) {
    throw new AppError('频道不存在', 404, 'NOT_FOUND');
  }

  if (channel.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
    throw new AppError('只有频道所有者或管理员可以添加成员', 403, 'FORBIDDEN');
  }

  const { memberId } = req.body as { memberId?: string };
  if (!memberId) {
    throw new AppError('缺少成员ID', 400, 'VALIDATION_ERROR');
  }

  const targetUser = await getServices().user.getUserById(memberId);
  if (!targetUser) {
    throw new AppError('用户不存在', 404, 'NOT_FOUND');
  }

  const memberIds = [...(channel.memberIds || [])];
  if (memberIds.includes(memberId)) {
    throw new AppError('该用户已是频道成员', 409, 'CONFLICT');
  }

  memberIds.push(memberId);
  await getServices().channel.updateChannel(req.params.id as string, { memberIds });

  res.json({ success: true, member: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar } });
}));

channelsRouter.delete('/:id/members/:memberId', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const channel = await getServices().channel.getChannelById(req.params.id as string);
  if (!channel) {
    throw new AppError('频道不存在', 404, 'NOT_FOUND');
  }

  if (channel.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin' && req.params.memberId !== authReq.user!.id) {
    throw new AppError('只有频道所有者、管理员或成员本人可以移除成员', 403, 'FORBIDDEN');
  }

  if (channel.ownerId === req.params.memberId) {
    throw new AppError('不能移除频道所有者', 403, 'FORBIDDEN');
  }

  const memberIds = (channel.memberIds || []).filter((id: string) => id !== req.params.memberId);
  await getServices().channel.updateChannel(req.params.id as string, { memberIds });

  res.json({ success: true });
}));