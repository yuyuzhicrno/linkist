import { Router } from 'express';
import { getServices } from '../services-registry.js';
import { getUser } from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const pollsRouter = Router();

pollsRouter.get('/:id', async (req, res) => {
  try {
    const poll = await getServices().poll.getPollById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    res.json(poll);
  } catch (err) {
    logger.error('获取投票错误:', err);
    res.status(500).json({ error: '获取投票失败' });
  }
});

pollsRouter.get('/post/:postId', async (req, res) => {
  try {
    const poll = await getServices().poll.getPollsForPost(req.params.postId);
    res.json(poll || null);
  } catch (err) {
    logger.error('获取帖子投票错误:', err);
    res.status(500).json({ error: '获取帖子投票失败' });
  }
});

pollsRouter.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { question, options, allowMultiple = false, endsAt = null, postId = null } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2)
      return res.status(400).json({ error: 'Question and at least 2 options required' });

    const poll = await getServices().poll.createPoll({
      question,
      options,
      authorId: user.id,
      postId,
      expiresAt: endsAt,
      allowMultiple
    });

    if (postId) {
      await getServices().post.updatePost(postId, { pollId: poll.id });
    }

    await getServices().user.addXp(user.id, 5);

    res.json(poll);
  } catch (err) {
    logger.error('创建投票错误:', err);
    res.status(500).json({ error: '创建投票失败' });
  }
});

pollsRouter.post('/:id/vote', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds) || optionIds.length === 0)
      return res.status(400).json({ error: 'optionIds required' });

    const poll = await getServices().poll.votePoll(req.params.id, user.id, optionIds);

    await getServices().user.addXp(user.id, 2);

    res.json(poll);
  } catch (err) {
    logger.error('投票错误:', err);
    res.status(500).json({ error: err.message || '投票失败' });
  }
});

pollsRouter.delete('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await getServices().poll.deletePoll(req.params.id, user.id, user.role);

    res.json({ success: true });
  } catch (err) {
    logger.error('删除投票错误:', err);
    res.status(500).json({ error: err.message || '删除投票失败' });
  }
});