import { Router } from 'express';
import { getServices } from '../services-registry.js';
import { emitToChannel } from '../services/socket.js';
import { validate, schemas, sanitizeInput } from '../middleware/validation.js';
import { authenticateWithUser, optionalAuth } from '../middleware/auth.js';

const getAuthor = async (authorId) => {
  const u = await getServices().user.getUserById(authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar };
};

export const channelsRouter = Router();

channelsRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const channels = await getServices().channel.getChannels();
    
    const filteredChannels = channels.filter(c => 
      c.isPublic || (req.user && c.memberIds?.includes(req.user.id))
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
    let ch = await getServices().channel.getChannelById(req.params.id);
    if (!ch) {
      ch = await getServices().channel.getChannelBySlug(req.params.id);
      if (!ch) return res.status(404).json({ error: 'Channel not found' });
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

channelsRouter.post('/', validate(schemas.createChannel), authenticateWithUser, async (req, res) => {
  try {
    const { level } = getServices().user.calcLevel(req.user.xp || 0);
    const CHANNEL_CREATE_LEVEL = 3;
    if (level < CHANNEL_CREATE_LEVEL && req.user.role !== 'admin')
      return res.status(403).json({ error: `需要达到 ${CHANNEL_CREATE_LEVEL} 级才能创建频道（当前 ${level} 级）` });
    
    const { name, description, icon, color, isPublic } = req.body;
    
    const channel = await getServices().channel.createChannel({
      name: sanitizeInput(name),
      description: sanitizeInput(description) || '',
      icon: sanitizeInput(icon) || '💬',
      color: sanitizeInput(color) || '#7c3aed',
      isPublic: isPublic !== false,
      ownerId: req.user.id
    });
    
    await getServices().user.addXp(req.user.id, 20);
    
    res.json(channel);
  } catch (err) {
    console.error('创建频道错误:', err);
    res.status(500).json({ error: err.message || '创建频道失败' });
  }
});

channelsRouter.post('/:id/join', authenticateWithUser, async (req, res) => {
  try {
    await getServices().channel.joinChannel(req.params.id, req.user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('加入频道错误:', err);
    res.status(500).json({ error: err.message || '加入频道失败' });
  }
});

channelsRouter.post('/:id/messages', validate(schemas.sendMessage), authenticateWithUser, async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await getServices().channel.sendMessage(req.params.id, {
      content: (sanitizeInput(content) || '').trim(),
      authorId: req.user.id
    });
    
    const msgWithAuthor = { ...msg, author: { id: req.user.id, username: req.user.username, avatar: req.user.avatar } };
    emitToChannel(req.params.id, 'message:new', msgWithAuthor);
    
    res.json(msgWithAuthor);
  } catch (err) {
    console.error('发送消息错误:', err);
    res.status(500).json({ error: err.message || '发送消息失败' });
  }
});

channelsRouter.post('/:channelId/messages/:msgId/react', authenticateWithUser, async (req, res) => {
  try {
    const { emoji } = req.body;
    const reactions = await getServices().channel.addReaction(req.params.channelId, req.params.msgId, emoji, req.user.id);
    
    emitToChannel(req.params.channelId, 'message:reaction', { messageId: req.params.msgId, reactions });
    
    res.json(reactions);
  } catch (err) {
    console.error('消息反应错误:', err);
    res.status(500).json({ error: err.message || '反应失败' });
  }
});

// 私密频道成员管理

channelsRouter.get('/:id/members', authenticateWithUser, async (req, res) => {
  try {
    const channel = await getServices().channel.getChannelById(req.params.id);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    
    if (!channel.isPublic && !channel.memberIds?.includes(req.user.id) && channel.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问此频道' });
    }
    
    const members = await Promise.all((channel.memberIds || []).map(async id => {
      const u = await getServices().user.getUserById(id);
      return u ? { id: u.id, username: u.username, avatar: u.avatar } : null;
    }));
    
    res.json(members.filter(Boolean));
  } catch (err) {
    console.error('获取频道成员错误:', err);
    res.status(500).json({ error: '获取成员失败' });
  }
});

channelsRouter.post('/:id/members', authenticateWithUser, async (req, res) => {
  try {
    const channel = await getServices().channel.getChannelById(req.params.id);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    
    if (channel.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '只有频道所有者或管理员可以添加成员' });
    }
    
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: '缺少成员ID' });
    
    const targetUser = await getServices().user.getUserById(memberId);
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });
    
    const memberIds = [...(channel.memberIds || [])];
    if (memberIds.includes(memberId)) {
      return res.status(409).json({ error: '该用户已是频道成员' });
    }
    
    memberIds.push(memberId);
    await getServices().channel.updateChannel(req.params.id, { memberIds });
    
    res.json({ success: true, member: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar } });
  } catch (err) {
    console.error('添加频道成员错误:', err);
    res.status(500).json({ error: '添加成员失败' });
  }
});

channelsRouter.delete('/:id/members/:memberId', authenticateWithUser, async (req, res) => {
  try {
    const channel = await getServices().channel.getChannelById(req.params.id);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    
    if (channel.ownerId !== req.user.id && req.user.role !== 'admin' && req.params.memberId !== req.user.id) {
      return res.status(403).json({ error: '只有频道所有者、管理员或成员本人可以移除成员' });
    }
    
    if (channel.ownerId === req.params.memberId) {
      return res.status(403).json({ error: '不能移除频道所有者' });
    }
    
    const memberIds = (channel.memberIds || []).filter(id => id !== req.params.memberId);
    await getServices().channel.updateChannel(req.params.id, { memberIds });
    
    res.json({ success: true });
  } catch (err) {
    console.error('移除频道成员错误:', err);
    res.status(500).json({ error: '移除成员失败' });
  }
});