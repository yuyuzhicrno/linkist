import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getServices } from '../services-registry.js';
import { getJwtSecret } from '../config/index.js';

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = jwt.verify(auth.slice(7), getJwtSecret());
    return await getServices().user.getUserById(userId);
  } catch { return null; }
};

export const columnsRouter = Router();

columnsRouter.get('/', async (req, res) => {
  try {
    const columns = await getServices().repo.columns();
    const enriched = await Promise.all(columns.map(async col => {
      const author = await getServices().user.getUserById(col.authorId);
      return { 
        ...col, 
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
        articleCount: (col.articles?.length || 0)
      };
    }));
    res.json(enriched);
  } catch (err) {
    console.error('获取专栏错误:', err);
    res.status(500).json({ error: '获取专栏失败' });
  }
});

columnsRouter.get('/:id', async (req, res) => {
  try {
    let col = await getServices().repo.columnById(req.params.id);
    if (!col) {
      col = await getServices().repo.queryOne('SELECT * FROM columns WHERE slug = $1', [req.params.id]);
    }
    
    if (!col) return res.status(404).json({ error: 'Column not found' });
    
    const author = await getServices().user.getUserById(col.authorId);
    res.json({ 
      ...col, 
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null 
    });
  } catch (err) {
    console.error('获取专栏详情错误:', err);
    res.status(500).json({ error: '获取专栏详情失败' });
  }
});

columnsRouter.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { title, description, coverColor } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const col = {
      id: uuidv4(), 
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: description || '', 
      authorId: user.id,
      coverColor: coverColor || '#7c3aed',
      followers: [], 
      articles: [],
      createdAt: new Date().toISOString()
    };
    
    await getServices().repo.query(
      `INSERT INTO columns (id, title, slug, description, "authorId", "coverColor", followers, articles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [col.id, col.title, col.slug, col.description, col.authorId, col.coverColor, JSON.stringify([]), JSON.stringify([])]
    );
    
    res.json(col);
  } catch (err) {
    console.error('创建专栏错误:', err);
    res.status(500).json({ error: '创建专栏失败' });
  }
});

columnsRouter.get('/:colId/articles/:artId', async (req, res) => {
  try {
    const col = await getServices().repo.queryOne('SELECT * FROM columns WHERE id = $1', [req.params.colId]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    
    const articles = col.articles || [];
    const art = articles.find(a => a.id === req.params.artId);
    if (!art) return res.status(404).json({ error: 'Article not found' });
    
    art.views = (art.views || 0) + 1;
    await getServices().repo.query('UPDATE columns SET articles = $1 WHERE id = $2', [JSON.stringify(articles), req.params.colId]);
    
    const author = await getServices().user.getUserById(col.authorId);
    res.json({ 
      ...art, 
      column: { 
        id: col.id, 
        title: col.title, 
        author: author ? { id: author.id, username: author.username } : null 
      } 
    });
  } catch (err) {
    console.error('获取文章错误:', err);
    res.status(500).json({ error: '获取文章失败' });
  }
});

columnsRouter.post('/:id/articles', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const col = await getServices().repo.queryOne('SELECT * FROM columns WHERE id = $1', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    if (col.authorId !== user.id) return res.status(403).json({ error: 'Forbidden' });
    
    const { title, summary, content, tags } = req.body;
    const wordCount = content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 300));
    
    const art = {
      id: uuidv4(), 
      title, 
      summary: summary || '',
      content: content || '', 
      tags: Array.isArray(tags) ? tags : [],
      likes: [], 
      views: 0, 
      readTime,
      createdAt: new Date().toISOString()
    };
    
    const articles = [...(col.articles || []), art];
    await getServices().repo.query('UPDATE columns SET articles = $1 WHERE id = $2', [JSON.stringify(articles), req.params.id]);
    
    res.json(art);
  } catch (err) {
    console.error('发布文章错误:', err);
    res.status(500).json({ error: '发布文章失败' });
  }
});

columnsRouter.post('/:colId/articles/:artId/like', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const col = await getServices().repo.queryOne('SELECT * FROM columns WHERE id = $1', [req.params.colId]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    
    const articles = col.articles || [];
    const artIdx = articles.findIndex(a => a.id === req.params.artId);
    if (artIdx === -1) return res.status(404).json({ error: 'Article not found' });
    
    const art = articles[artIdx];
    const likeIdx = (art.likes || []).indexOf(user.id);
    if (likeIdx === -1) {
      art.likes = [...(art.likes || []), user.id];
    } else {
      art.likes = (art.likes || []).filter(id => id !== user.id);
    }
    
    await getServices().repo.query('UPDATE columns SET articles = $1 WHERE id = $2', [JSON.stringify(articles), req.params.colId]);
    
    res.json({ likes: art.likes.length, liked: likeIdx === -1 });
  } catch (err) {
    console.error('点赞文章错误:', err);
    res.status(500).json({ error: '点赞失败' });
  }
});

columnsRouter.post('/:id/follow', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const col = await getServices().repo.queryOne('SELECT * FROM columns WHERE id = $1', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    
    const followers = [...(col.followers || [])];
    const idx = followers.indexOf(user.id);
    if (idx === -1) {
      followers.push(user.id);
    } else {
      followers.splice(idx, 1);
    }
    
    await getServices().repo.query('UPDATE columns SET followers = $1 WHERE id = $2', [JSON.stringify(followers), req.params.id]);
    
    res.json({ followed: idx === -1, followers: followers.length });
  } catch (err) {
    console.error('关注专栏错误:', err);
    res.status(500).json({ error: '关注失败' });
  }
});