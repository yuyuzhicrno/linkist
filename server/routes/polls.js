// Polls router
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, addXp } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

export const pollsRouter = Router();

// GET poll by id
pollsRouter.get('/:id', (req, res) => {
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  res.json(poll);
});

// GET poll by postId
pollsRouter.get('/post/:postId', (req, res) => {
  const poll = db.polls.find(p => p.postId === req.params.postId);
  res.json(poll || null);
});

// POST create poll (standalone or for a post)
pollsRouter.post('/', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { question, options, allowMultiple = false, endsAt = null, postId = null } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2)
    return res.status(400).json({ error: 'Question and at least 2 options required' });
  const poll = {
    id: uuidv4(),
    postId,
    question,
    options: options.map(text => ({ id: uuidv4(), text, votes: [] })),
    allowMultiple,
    endsAt,
    authorId: user.id,
    createdAt: new Date().toISOString()
  };
  db.polls.push(poll);
  if (postId) {
    const post = db.posts.find(p => p.id === postId);
    if (post) post.pollId = poll.id;
  }
  addXp(user.id, 5);
  res.json(poll);
});

// POST vote on poll
pollsRouter.post('/:id/vote', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.endsAt && new Date(poll.endsAt) < new Date())
    return res.status(400).json({ error: 'Poll has ended' });
  const { optionIds } = req.body; // array of option ids
  if (!Array.isArray(optionIds) || optionIds.length === 0)
    return res.status(400).json({ error: 'optionIds required' });
  if (!poll.allowMultiple && optionIds.length > 1)
    return res.status(400).json({ error: 'This poll only allows one vote' });
  // Remove existing votes
  poll.options.forEach(opt => { opt.votes = opt.votes.filter(uid => uid !== user.id); });
  // Add new votes
  optionIds.forEach(oid => {
    const opt = poll.options.find(o => o.id === oid);
    if (opt && !opt.votes.includes(user.id)) opt.votes.push(user.id);
  });
  addXp(user.id, 2);
  res.json(poll);
});

// DELETE poll (author or admin)
pollsRouter.delete('/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const idx = db.polls.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (db.polls[idx].authorId !== user.id && user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  db.polls.splice(idx, 1);
  res.json({ success: true });
});
