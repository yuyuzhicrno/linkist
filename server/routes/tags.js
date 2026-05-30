import { Router } from 'express';
import { getServices } from '../services-registry.js';

export const tagsRouter = Router();

tagsRouter.get('/', async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    let tags = await getServices().tag.getAllTags();
    
    if (q) tags = tags.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
    tags.sort((a, b) => (b.count || 0) - (a.count || 0));
    
    res.json(tags.slice(0, Number(limit)));
  } catch (err) {
    console.error('获取标签错误:', err);
    res.status(500).json({ error: '获取标签失败' });
  }
});

tagsRouter.get('/:tag/content', async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const posts = await getServices().repo.posts({ tag });
    
    const enrichedPosts = await Promise.all(posts.posts.map(async p => {
      const author = await getServices().user.getUserById(p.authorId);
      return {
        type: 'post',
        id: p.id,
        title: p.title,
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
        voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0),
        commentCount: (p.comments?.length || 0),
        createdAt: p.createdAt
      };
    }));
    
    const articles = [];
    const columns = await getServices().repo.columns();
    for (const col of columns) {
      for (const a of col.articles || []) {
        if (a.tags?.includes(tag)) {
          const author = await getServices().user.getUserById(col.authorId);
          articles.push({
            type: 'article',
            id: a.id,
            columnId: col.id,
            title: a.title,
            summary: a.summary,
            author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
            likes: (a.likes?.length || 0),
            readTime: a.readTime,
            createdAt: a.createdAt
          });
        }
      }
    }
    
    const all = [...enrichedPosts, ...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ tag, total: all.length, items: all });
  } catch (err) {
    console.error('获取标签内容错误:', err);
    res.status(500).json({ error: '获取标签内容失败' });
  }
});