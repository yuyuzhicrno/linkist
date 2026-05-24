import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, addXp, syncTagCount } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

const enrichAuthor = (authorId) => {
  const u = db.users.find(u => u.id === authorId);
  if (!u) return null;
  const { calcLevel } = require('../data/db.js');
  return null; // see below
};

const getAuthor = (authorId) => {
  const u = db.users.find(u => u.id === authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar, xp: u.xp || 0 };
};

const enrichPost = (post) => ({
  ...post,
  author: getAuthor(post.authorId),
  voteCount: post.upvotes.length - post.downvotes.length,
  commentCount: post.comments.length
});

const enrichComment = (c) => ({
  ...c,
  author: getAuthor(c.authorId),
  voteCount: (c.upvotes || []).length - (c.downvotes || []).length,
  replies: (c.replies || []).map(r => ({
    ...r,
    author: getAuthor(r.authorId),
    voteCount: (r.upvotes || []).length - (r.downvotes || []).length
  }))
});

export const postsRouter = Router();

// GET all posts with filters
postsRouter.get('/', (req, res) => {
  const { sort = 'hot', category, tag, search } = req.query;
  let posts = [...db.posts];
  if (category) posts = posts.filter(p => p.category === category);
  if (tag) posts = posts.filter(p => p.tags.includes(tag));
  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }
  if (sort === 'hot') posts.sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length));
  else if (sort === 'new') posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === 'top') posts.sort((a, b) => b.upvotes.length - a.upvotes.length);
  res.json(posts.map(enrichPost));
});

// GET single post
postsRouter.get('/:id', (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.views++;
  const enriched = enrichPost(post);
  enriched.comments = post.comments.map(enrichComment);
  // Attach poll if exists
  if (post.pollId) enriched.poll = db.polls.find(p => p.id === post.pollId) || null;
  res.json(enriched);
});

// POST create post
postsRouter.post('/', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, content, category, tags, flair } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  const post = {
    id: uuidv4(), title, content,
    authorId: user.id,
    category: category || '综合',
    tags: Array.isArray(tags) ? tags : [],
    flair: flair || '',
    upvotes: [], downvotes: [],
    views: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    isPinned: false,
    pollId: null
  };
  db.posts.push(post);
  addXp(user.id, 10);
  post.tags.forEach(t => syncTagCount(t));
  res.json(enrichPost(post));
});

// POST vote on post
postsRouter.post('/:id/vote', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { type } = req.body; // 'up' | 'down' | 'none'
  const wasUp = post.upvotes.includes(user.id);
  const wasDown = post.downvotes.includes(user.id);
  post.upvotes = post.upvotes.filter(id => id !== user.id);
  post.downvotes = post.downvotes.filter(id => id !== user.id);
  if (type === 'up' && !wasUp) { post.upvotes.push(user.id); addXp(user.id, 1); addXp(post.authorId, 2); }
  else if (type === 'down' && !wasDown) { post.downvotes.push(user.id); }
  res.json({ upvotes: post.upvotes.length, downvotes: post.downvotes.length, voteCount: post.upvotes.length - post.downvotes.length });
});

// POST comment on post
postsRouter.post('/:id/comments', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const comment = {
    id: uuidv4(), authorId: user.id,
    content: content.trim(),
    upvotes: [], downvotes: [],
    replies: [],
    createdAt: new Date().toISOString()
  };
  post.comments.push(comment);
  addXp(user.id, 3);
  addXp(post.authorId, 1);
  res.json(enrichComment(comment));
});

// POST reply to a comment
postsRouter.post('/:id/comments/:commentId/replies', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comment = post.comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const reply = {
    id: uuidv4(), authorId: user.id,
    content: content.trim(),
    upvotes: [], downvotes: [],
    createdAt: new Date().toISOString()
  };
  comment.replies = comment.replies || [];
  comment.replies.push(reply);
  addXp(user.id, 2);
  res.json({ ...reply, author: { id: user.id, username: user.username, avatar: user.avatar } });
});

// POST vote on comment
postsRouter.post('/:id/comments/:commentId/vote', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comment = post.comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const { type } = req.body;
  comment.upvotes = (comment.upvotes || []).filter(id => id !== user.id);
  comment.downvotes = (comment.downvotes || []).filter(id => id !== user.id);
  if (type === 'up') { comment.upvotes.push(user.id); addXp(comment.authorId, 1); }
  else if (type === 'down') comment.downvotes.push(user.id);
  res.json({ upvotes: comment.upvotes.length, downvotes: comment.downvotes.length });
});

// DELETE post
postsRouter.delete('/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const idx = db.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (db.posts[idx].authorId !== user.id && user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  db.posts.splice(idx, 1);
  res.json({ success: true });
});
