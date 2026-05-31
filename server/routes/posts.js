import { Router } from 'express';
import { getServices } from '../services-registry.js';
import { validate, schemas, sanitizeInput } from '../middleware/validation.js';
import { authenticateWithUser, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const getAuthor = async (authorId) => {
  const u = await getServices().user.getUserById(authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar, xp: u.xp || 0 };
};

const enrichPost = async (post) => ({
  ...post,
  author: await getAuthor(post.authorId),
  voteCount: (post.upvotes?.length || 0) - (post.downvotes?.length || 0),
  commentCount: (post.commentCount || 0)
});

const enrichComment = async (c) => ({
  ...c,
  author: await getAuthor(c.authorId),
  voteCount: ((c.upvotes || []).length || 0) - ((c.downvotes || []).length || 0),
  replies: await Promise.all((c.replies || []).map(async r => ({
    ...r,
    author: await getAuthor(r.authorId),
    voteCount: ((r.upvotes || []).length || 0) - ((r.downvotes || []).length || 0)
  })))
});

export const postsRouter = Router();

postsRouter.get('/', async (req, res) => {
  try {
    const { sort = 'hot', category, tag, search, page = 1, limit = 20 } = req.query;
    
    let postsResult = await getServices().post.getPosts({ page, limit });
    let posts = postsResult.posts || postsResult;
    
    if (Array.isArray(posts)) {
      if (category) posts = posts.filter(p => p.category === category);
      if (tag) posts = posts.filter(p => (p.tags || []).includes(tag));
      if (search) {
        const q = search.toLowerCase();
        posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
      }
      
      if (sort === 'hot') posts.sort((a, b) => ((b.upvotes?.length || 0) - (b.downvotes?.length || 0)) - ((a.upvotes?.length || 0) - (a.downvotes?.length || 0)));
      else if (sort === 'new') posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      else if (sort === 'top') posts.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
    }
    
    const enrichedPosts = await Promise.all(posts.map(enrichPost));
    res.json(enrichedPosts);
  } catch (err) {
    logger.error('获取帖子错误:', err);
    res.status(500).json({ error: '获取帖子失败' });
  }
});

postsRouter.get('/:id', async (req, res) => {
  try {
    const post = await getServices().post.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await getServices().post.addView(req.params.id);

    const enriched = await enrichPost(post);
    enriched.comments = await getServices().post.getComments(req.params.id);

    res.json(enriched);
  } catch (err) {
    logger.error('获取帖子详情错误:', err);
    res.status(500).json({ error: '获取帖子详情失败' });
  }
});

postsRouter.post('/', validate(schemas.createPost), authenticateWithUser, async (req, res) => {
  try {
    const { title, content, category, tags, flair } = req.body;
    
    const post = await getServices().post.createPost({
      title: sanitizeInput(title),
      content: sanitizeInput(content),
      authorId: req.user.id,
      category: sanitizeInput(category) || '综合',
      tags: Array.isArray(tags) ? tags.map(t => sanitizeInput(t)) : [],
      flair: sanitizeInput(flair) || ''
    });
    
    await getServices().user.addXp(req.user.id, 10);
    
    res.json(await enrichPost(post));
  } catch (err) {
    logger.error('创建帖子错误:', err);
    res.status(500).json({ error: '创建帖子失败' });
  }
});

postsRouter.post('/:id/vote', authenticateWithUser, async (req, res) => {
  try {
    const { type } = req.body;
    const post = await getServices().post.vote(req.params.id, req.user.id, type);
    
    if (type === 'up') {
      await getServices().user.addXp(req.user.id, 1);
      await getServices().notification.createPostNotification(req.params.id, post.authorId, req.user.id, req.user.username, 'upvote');
    }
    
    res.json({ upvotes: post.upvotes || [], downvotes: post.downvotes || [], voteCount: (post.upvotes?.length || 0) - (post.downvotes?.length || 0) });
  } catch (err) {
    logger.error('投票错误:', err);
    res.status(500).json({ error: '投票失败' });
  }
});

postsRouter.post('/:id/comments', authenticateWithUser, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    
    const comment = await getServices().post.addComment(req.params.id, req.user.id, content.trim());
    
    await getServices().user.addXp(req.user.id, 3);
    
    const post = await getServices().post.getPostById(req.params.id);
    if (post && post.authorId !== req.user.id) {
      await getServices().notification.createPostNotification(req.params.id, post.authorId, req.user.id, req.user.username, 'comment');
    }
    
    res.json(await enrichComment(comment));
  } catch (err) {
    logger.error('评论错误:', err);
    res.status(500).json({ error: '评论失败' });
  }
});

postsRouter.post('/:id/comments/:commentId/replies', authenticateWithUser, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    const reply = await getServices().post.addReply(req.params.commentId, req.user.id, content.trim());

    await getServices().user.addXp(req.user.id, 2);

    const comments = await getServices().post.getComments(req.params.id);
    const comment = comments.find(c => c.id === req.params.commentId);
    if (comment && comment.authorId !== req.user.id) {
      await getServices().notification.createNotification(comment.authorId, 'reply', '有人回复了你的评论', `${req.user.username} 回复了你的评论`, { postId: req.params.id, commentId: req.params.commentId });
    }

    res.json({ ...reply, author: { id: req.user.id, username: req.user.username, avatar: req.user.avatar } });
  } catch (err) {
    logger.error('回复错误:', err);
    res.status(500).json({ error: '回复失败' });
  }
});

postsRouter.post('/:id/comments/:commentId/vote', authenticateWithUser, async (req, res) => {
  try {
    const comment = await getServices().post.voteComment(req.params.commentId, req.user.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (req.body.type === 'up') {
      await getServices().user.addXp(comment.authorId, 1);
    }

    res.json({ upvotes: comment.upvotes?.length || 0, downvotes: 0 });
  } catch (err) {
    logger.error('评论投票错误:', err);
    res.status(500).json({ error: '投票失败' });
  }
});

postsRouter.put('/:id/comments/:commentId', authenticateWithUser, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined || !content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    const comment = await getServices().post.updateComment(
      req.params.commentId,
      req.user.id,
      req.user.role,
      content
    );

    res.json(await enrichComment(comment));
  } catch (err) {
    logger.error('更新评论错误:', err);
    if (err.message === '评论不存在') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (err.message === '没有权限修改这条评论') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: '更新评论失败' });
  }
});

postsRouter.delete('/:id/comments/:commentId', authenticateWithUser, async (req, res) => {
  try {
    await getServices().post.deleteComment(
      req.params.commentId,
      req.user.id,
      req.user.role
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('删除评论错误:', err);
    if (err.message === '评论不存在') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (err.message === '没有权限删除这条评论') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: '删除评论失败' });
  }
});

postsRouter.put('/:id', authenticateWithUser, async (req, res) => {
  try {
    const post = await getServices().post.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { title, content, category, tags, flair } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : post.tags;
    if (flair !== undefined) updates.flair = flair;
    
    const updated = await getServices().post.updatePost(req.params.id, updates);
    res.json(await enrichPost(updated));
  } catch (err) {
    logger.error('更新帖子错误:', err);
    res.status(500).json({ error: '更新帖子失败' });
  }
});

postsRouter.delete('/:id', authenticateWithUser, async (req, res) => {
  try {
    const post = await getServices().post.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await getServices().post.deletePost(req.params.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('删除帖子错误:', err);
    res.status(500).json({ error: '删除帖子失败' });
  }
});

postsRouter.patch('/:id/pin', authenticateWithUser, async (req, res) => {
  try {
    const post = await getServices().post.pinPost(req.params.id, req.user.id);
    res.json({ success: true, isPinned: post.isPinned });
  } catch (err) {
    if (err.message === '没有权限置顶帖子') {
      return res.status(403).json({ error: err.message });
    }
    logger.error('置顶帖子错误:', err);
    res.status(500).json({ error: '置顶失败' });
  }
});