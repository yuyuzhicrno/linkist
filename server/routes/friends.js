import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getServices } from '../services-registry.js';
import { emitDmToParticipants } from '../services/socket.js';
import { getJwtSecret } from '../config/index.js';

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), getJwtSecret());
    return await getServices().user.getUserById(userId);
  } catch { return null; }
};

const safeUser = (user) => {
  if (!user) return null;
  return { id: user.id, username: user.username, avatar: user.avatar, bio: user.bio };
};

export const friendsRouter = Router();

friendsRouter.get('/', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    const friends = await getServices().friend.getFriends(me.id);
    const requests = await getServices().friend.getFriendRequests(me.id);
    
    res.json({
      friends: friends.map(safeUser).filter(Boolean),
      requests: requests.map(safeUser).filter(Boolean)
    });
  } catch (err) {
    console.error('获取好友列表错误:', err);
    res.status(500).json({ error: '获取好友列表失败' });
  }
});

friendsRouter.post('/request/:targetId', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    await getServices().friend.sendFriendRequest(me.id, req.params.targetId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('发送好友请求错误:', err);
    res.status(500).json({ error: err.message || '发送好友请求失败' });
  }
});

friendsRouter.post('/accept/:requesterId', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    await getServices().friend.acceptFriendRequest(me.id, req.params.requesterId);
    await getServices().user.addXp(me.id, 5);
    
    const requester = await getServices().user.getUserById(req.params.requesterId);
    if (requester) {
      await getServices().user.addXp(requester.id, 5);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('接受好友请求错误:', err);
    res.status(500).json({ error: err.message || '接受好友请求失败' });
  }
});

friendsRouter.delete('/remove/:otherId', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    await getServices().friend.removeFriend(me.id, req.params.otherId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('移除好友错误:', err);
    res.status(500).json({ error: err.message || '移除好友失败' });
  }
});

friendsRouter.get('/dms', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    const dms = await getServices().friend.getDirectMessagesForUser(me.id);
    
    const convos = await Promise.all(dms.map(async dm => {
      const otherId = dm.participants?.find(id => id !== me.id);
      const other = otherId ? await getServices().user.getUserById(otherId) : null;
      const lastMsg = dm.messages?.length > 0 ? dm.messages[dm.messages.length - 1] : null;
      const unread = dm.messages?.filter(m => m.senderId !== me.id && !m.read)?.length || 0;
      return { id: dm.id, other: safeUser(other), lastMessage: lastMsg, unread };
    }));
    
    res.json(convos);
  } catch (err) {
    console.error('获取私信列表错误:', err);
    res.status(500).json({ error: '获取私信列表失败' });
  }
});

friendsRouter.get('/dms/:userId', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    const otherId = req.params.userId;
    let convo = await getServices().friend.getDirectMessage([me.id, otherId]);
    
    if (!convo) {
      convo = await getServices().friend.createDirectMessage([me.id, otherId]);
    }
    
    convo.messages?.forEach(m => { if (m.senderId !== me.id) m.read = true; });
    
    const other = await getServices().user.getUserById(otherId);
    const messages = await Promise.all((convo.messages || []).map(async m => {
      const sender = await getServices().user.getUserById(m.senderId);
      return { ...m, sender: sender ? { id: sender.id, username: sender.username, avatar: sender.avatar } : null };
    }));
    
    res.json({ id: convo.id, other: safeUser(other), messages });
  } catch (err) {
    console.error('获取私信对话错误:', err);
    res.status(500).json({ error: '获取私信对话失败' });
  }
});

friendsRouter.post('/dms/:userId', async (req, res) => {
  try {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    
    const otherId = req.params.userId;
    const { content } = req.body;
    
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    
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
  } catch (err) {
    console.error('发送私信错误:', err);
    res.status(500).json({ error: err.message || '发送私信失败' });
  }
});