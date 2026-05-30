import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getServices } from '../services-registry.js';
import { emitToChannel } from '../services/socket.js';
import { validate, schemas, sanitizeInput } from '../middleware/validation.js';
import { getJwtSecret } from '../config/index.js';

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), getJwtSecret());
    return await getServices().user.getUserById(userId);
  } catch { return null; }
};

const getAuthor = async (authorId) => {
  const u = await getServices().user.getUserById(authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar };
};

export const channelsRouter = Router();

channelsRouter.get('/', async (req, res) => {
  try {
    const user = await getUser(req);
    const channels = await getServices().channel.getChannels();
    
    const filteredChannels = channels.filter(c => 
      c.isPublic || (user && c.memberIds?.includes(user.id))
    );
    
    const enrichedChannels = await Promise.all(filteredChannels.map(async ch => ({
      ...ch,
      messageCount: (ch.messages?.length || 0),
      lastMessage: ch.messages?.length > 0 ? ch.messages[ch.messages.length - 1] : null
    })));
    
    res.json(enrichedChannels);
  } catch (err) {
    console.error('获取频道错误:', err);
    res.status(500).json({ error: '获取频道失败' });
  }
});

channelsRouter.get('/:id', async (req, res) => {
  try {
    const ch = await getServices().channel.getChannelById(req.params.id);
    if (!ch) {
      const chBySlug = await getServices().channel.getChannelBySlug(req.params.id);
      if (!chBySlug) return res.status(404).json({ error: 'Channel not found' });
      ch = chBySlug;
    }
    
    const messages = await Promise.all((ch.messages || []).map(async m => ({
      ...m,
      author: await getAuthor(m.authorId)
    })));
    
    res.json({ ...ch, messages });
  } catch (err) {
    console.error('获取频道详情错误:', err);
    res.status(500).json({ error: '获取频道详情失败' });
  }
});

channelsRouter.post('/', validate(schemas.createChannel), async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { level } = getServices().user.calcLevel(user.xp || 0);
    const CHANNEL_CREATE_LEVEL = 3;
    if (level < CHANNEL_CREATE_LEVEL && user.role !== 'admin')
      return res.status(403).json({ error: `需要达到 ${CHANNEL_CREATE_LEVEL} 级才能创建频道（当前 ${level} 级）` });
    
    const { name, description, icon, color, isPublic } = req.body;
    
    const channel = await getServices().channel.createChannel({
      name: sanitizeInput(name),
      description: sanitizeInput(description) || '',
      icon: sanitizeInput(icon) || '💬',
      color: sanitizeInput(color) || '#7c3aed',
      isPublic: isPublic !== false,
      ownerId: user.id
    });
    
    await getServices().user.addXp(user.id, 20);
    
    res.json(channel);
  } catch (err) {
    console.error('创建频道错误:', err);
    res.status(500).json({ error: err.message || '创建频道失败' });
  }
});

channelsRouter.post('/:id/join', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    await getServices().channel.joinChannel(req.params.id, user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('加入频道错误:', err);
    res.status(500).json({ error: err.message || '加入频道失败' });
  }
});

channelsRouter.post('/:id/messages', validate(schemas.sendMessage), async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { content } = req.body;
    const msg = await getServices().channel.sendMessage(req.params.id, {
      content: (sanitizeInput(content) || '').trim(),
      authorId: user.id
    });
    
    const msgWithAuthor = { ...msg, author: { id: user.id, username: user.username, avatar: user.avatar } };
    emitToChannel(req.params.id, 'message:new', msgWithAuthor);
    
    res.json(msgWithAuthor);
  } catch (err) {
    console.error('发送消息错误:', err);
    res.status(500).json({ error: err.message || '发送消息失败' });
  }
});

channelsRouter.post('/:channelId/messages/:msgId/react', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { emoji } = req.body;
    const reactions = await getServices().channel.addReaction(req.params.channelId, req.params.msgId, emoji, user.id);
    
    emitToChannel(req.params.channelId, 'message:reaction', { messageId: req.params.msgId, reactions });
    
    res.json(reactions);
  } catch (err) {
    console.error('消息反应错误:', err);
    res.status(500).json({ error: err.message || '反应失败' });
  }
});