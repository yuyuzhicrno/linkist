import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkist_dev_secret_2026';
const getUser = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { const { userId } = jwt.verify(auth.slice(7), JWT_SECRET); return db.data.users.find(u => u.id === userId) || null; }
  catch { return null; }
};

// Reuse posts endpoint with enrichment
export const dbRouter = Router();

// Hot topics, trending tags, stats for home/discussion page
dbRouter.get('/stats', (req, res) => {
  const totalPosts = db.data.posts.length;
  const totalUsers = db.data.users.length;
  const totalChannels = db.data.channels.length;
  const totalMessages = db.data.channels.reduce((s, c) => s + c.messages.length, 0);
  
  const allTags = db.data.posts.flatMap(p => p.tags);
  const tagCounts = {};
  allTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const hotPosts = db.data.posts
    .filter(p => !p.isPinned)
    .sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length))
    .slice(0, 5)
    .map(p => {
      const author = db.data.users.find(u => u.id === p.authorId);
      return { id: p.id, title: p.title, voteCount: p.upvotes.length - p.downvotes.length, author: author?.username };
    });

  res.json({ totalPosts, totalUsers, totalChannels, totalMessages, trendingTags, hotPosts });
});

// All categories
dbRouter.get('/categories', (req, res) => {
  const cats = [...new Set(db.data.posts.map(p => p.category))];
  res.json(cats.map(c => ({
    name: c,
    count: db.data.posts.filter(p => p.category === c).length
  })));
});
