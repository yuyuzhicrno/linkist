import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { emitDmToParticipants } from '../services/socket';
import { getUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User, DirectMessage } from '../types/index';

interface SafeUserInfo {
  id: string;
  username: string;
  avatar: string | null;
  bio: string;
}

interface DmMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  read?: boolean;
}

interface Convo {
  id: string;
  other: SafeUserInfo | null;
  lastMessage: DmMessage | null;
  unread: number;
}

const safeUser = (user: User | null): SafeUserInfo | null => {
  if (!user) return null;
  return { id: user.id, username: user.username, avatar: user.avatar, bio: user.bio };
};

export const friendsRouter = Router();

friendsRouter.get('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const friends = await getServices().friend.getFriends(me.id);
  const requests = await getServices().friend.getFriendRequests(me.id);

  res.json({
    friends: friends.map(safeUser).filter(Boolean),
    requests: requests.map(safeUser).filter(Boolean)
  });
}));

friendsRouter.post('/request/:targetId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().friend.sendFriendRequest(me.id, req.params.targetId as string);

  res.json({ success: true });
}));

friendsRouter.post('/accept/:requesterId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().friend.acceptFriendRequest(me.id, req.params.requesterId as string);
  await getServices().user.addXp(me.id, 5);

  const requester = await getServices().user.getUserById(req.params.requesterId as string);
  if (requester) {
    await getServices().user.addXp(requester.id, 5);
  }

  res.json({ success: true });
}));

friendsRouter.delete('/remove/:otherId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await getServices().friend.removeFriend(me.id, req.params.otherId as string);

  res.json({ success: true });
}));

friendsRouter.get('/dms', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const dms = await getServices().friend.getDirectMessagesForUser(me.id);

  const convos = await Promise.all(dms.map(async (dm: DirectMessage) => {
    const otherId = dm.participants?.find(id => id !== me.id);
    const other = otherId ? await getServices().user.getUserById(otherId) : null;
    const messages = (dm as { messages?: DmMessage[] }).messages || [];
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const unread = messages.filter(m => m.senderId !== me.id && !m.read).length || 0;
    return { id: dm.id, other: safeUser(other), lastMessage: lastMsg, unread } as Convo;
  }));

  res.json(convos);
}));

friendsRouter.get('/dms/:userId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const otherId = req.params.userId as string;
  let convo = await getServices().friend.getDirectMessage([me.id, otherId]);

  if (!convo) {
    convo = await getServices().friend.createDirectMessage([me.id, otherId]);
  }

  const dmMessages = (convo as { messages?: DmMessage[] }).messages || [];
  dmMessages.forEach(m => { if (m.senderId !== me.id) m.read = true; });

  const other = await getServices().user.getUserById(otherId);
  const messages = await Promise.all(dmMessages.map(async (m: DmMessage) => {
    const sender = await getServices().user.getUserById(m.senderId);
    return { ...m, sender: sender ? { id: sender.id, username: sender.username, avatar: sender.avatar } : null };
  }));

  res.json({ id: convo.id, other: safeUser(other), messages });
}));

friendsRouter.post('/dms/:userId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const me = await getUser(req) as User;
  if (!me) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const otherId = req.params.userId as string;
  const { content } = req.body as { content?: string };

  if (!content?.trim()) {
    throw new AppError('Content required', 400, 'VALIDATION_ERROR');
  }

  let convo = await getServices().friend.getDirectMessage([me.id, otherId]);

  if (!convo) {
    convo = await getServices().friend.createDirectMessage([me.id, otherId]);
  }

  const msg = await getServices().friend.sendDirectMessage(convo.id, {
    content: content.trim(),
    authorId: me.id
  });

  await getServices().user.addXp(me.id, 1);

  const msgWithSender = {
    ...msg,
    senderId: me.id,
    sender: { id: me.id, username: me.username, avatar: me.avatar },
    read: false
  };

  emitDmToParticipants(convo, 'dm:message:new', { convoId: convo.id, message: msgWithSender });

  res.json(msgWithSender);
}));