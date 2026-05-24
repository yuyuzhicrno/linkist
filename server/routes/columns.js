import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const columnsRouter = Router();

// GET all columns
columnsRouter.get('/', (req, res) => {
  const columns = db.columns.map(col => {
    const author = db.users.find(u => u.id === col.authorId);
    return { ...col, author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null, articleCount: col.articles.length };
  });
  res.json(columns);
});

// GET single column
columnsRouter.get('/:id', (req, res) => {
  const col = db.columns.find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  const author = db.users.find(u => u.id === col.authorId);
  res.json({ ...col, author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null });
});

// POST create column
columnsRouter.post('/', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, description, coverColor } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const col = {
    id: uuidv4(), title,
    slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    description: description || '', authorId: user.id,
    coverColor: coverColor || '#7c3aed',
    followers: [], articles: [],
    createdAt: new Date().toISOString()
  };
  db.columns.push(col);
  res.json(col);
});

// GET article
columnsRouter.get('/:colId/articles/:artId', (req, res) => {
  const col = db.columns.find(c => c.id === req.params.colId);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  const art = col.articles.find(a => a.id === req.params.artId);
  if (!art) return res.status(404).json({ error: 'Article not found' });
  art.views++;
  const author = db.users.find(u => u.id === col.authorId);
  res.json({ ...art, column: { id: col.id, title: col.title, author: author ? { id: author.id, username: author.username } : null } });
});

// POST publish article
columnsRouter.post('/:id/articles', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const col = db.columns.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  if (col.authorId !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const { title, summary, content, tags } = req.body;
  const wordCount = content?.split(/\s+/).length || 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 300));
  const art = {
    id: uuidv4(), title, summary: summary || '',
    content: content || '', tags: Array.isArray(tags) ? tags : [],
    likes: [], views: 0, readTime,
    createdAt: new Date().toISOString()
  };
  col.articles.push(art);
  res.json(art);
});

// POST like article
columnsRouter.post('/:colId/articles/:artId/like', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const col = db.columns.find(c => c.id === req.params.colId);
  const art = col?.articles.find(a => a.id === req.params.artId);
  if (!art) return res.status(404).json({ error: 'Article not found' });
  const idx = art.likes.indexOf(user.id);
  if (idx === -1) art.likes.push(user.id); else art.likes.splice(idx, 1);
  res.json({ likes: art.likes.length, liked: idx === -1 });
});

// POST follow column
columnsRouter.post('/:id/follow', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const col = db.columns.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  const idx = col.followers.indexOf(user.id);
  if (idx === -1) col.followers.push(user.id); else col.followers.splice(idx, 1);
  res.json({ followed: idx === -1, followers: col.followers.length });
});
