// Tags router
import { Router } from 'express';
import { db } from '../data/db.js';

export const tagsRouter = Router();

// GET all tags (with optional search)
tagsRouter.get('/', (req, res) => {
  const { q, limit = 50 } = req.query;
  let tags = [...db.data.tags];
  if (q) tags = tags.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
  tags.sort((a, b) => b.count - a.count);
  res.json(tags.slice(0, Number(limit)));
});

// GET posts/articles by tag
tagsRouter.get('/:tag/content', (req, res) => {
  const tag = decodeURIComponent(req.params.tag);
  const posts = db.data.posts
    .filter(p => p.tags.includes(tag))
    .map(p => {
      const author = db.data.users.find(u => u.id === p.authorId);
      return {
        type: 'post',
        id: p.id,
        title: p.title,
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
        voteCount: p.upvotes.length - p.downvotes.length,
        commentCount: p.comments.length,
        createdAt: p.createdAt
      };
    });
  const articles = [];
  db.data.columns.forEach(col => {
    col.articles.filter(a => a.tags.includes(tag)).forEach(a => {
      const author = db.data.users.find(u => u.id === col.authorId);
      articles.push({
        type: 'article',
        id: a.id,
        columnId: col.id,
        title: a.title,
        summary: a.summary,
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
        likes: a.likes.length,
        readTime: a.readTime,
        createdAt: a.createdAt
      });
    });
  });
  const all = [...posts, ...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ tag, total: all.length, items: all });
});
