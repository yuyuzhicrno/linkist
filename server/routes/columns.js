import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getServices } from '../services-registry.js';
import { getUser } from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const columnsRouter = Router();

columnsRouter.get('/', async (req, res) => {
  try {
    const { columns } = await getServices().column.getColumns();
    const enriched = await Promise.all(columns.map(async col => {
      const author = await getServices().user.getUserById(col.authorId);
      return {
        ...col,
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null
      };
    }));
    res.json(enriched);
  } catch (err) {
    logger.error('获取专栏错误:', err);
    res.status(500).json({ error: '获取专栏失败' });
  }
});

columnsRouter.get('/:id', async (req, res) => {
  try {
    let col = await getServices().column.getColumnById(req.params.id);
    if (!col) {
      col = await getServices().column.getColumnBySlug(req.params.id);
    }

    if (!col) return res.status(404).json({ error: 'Column not found' });

    const author = await getServices().user.getUserById(col.authorId);
    const articles = await getServices().column.columnPosts(req.params.id);
    
    res.json({
      ...col,
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
      articles: articles.posts
    });
  } catch (err) {
    logger.error('获取专栏详情错误:', err);
    res.status(500).json({ error: '获取专栏详情失败' });
  }
});

columnsRouter.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, coverColor } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const col = await getServices().column.createColumn({
      title,
      description,
      coverColor,
      authorId: user.id
    });

    res.json(col);
  } catch (err) {
    logger.error('创建专栏错误:', err);
    res.status(500).json({ error: '创建专栏失败' });
  }
});

columnsRouter.get('/:colId/articles/:artId', async (req, res) => {
  try {
    const article = await getServices().column.getColumnArticle(req.params.colId, req.params.artId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const col = await getServices().column.getColumnById(req.params.colId);
    const author = await getServices().user.getUserById(col.authorId);
    res.json({
      ...article,
      column: {
        id: col.id,
        title: col.title,
        author: author ? { id: author.id, username: author.username } : null
      }
    });
  } catch (err) {
    logger.error('获取文章错误:', err);
    res.status(500).json({ error: '获取文章失败' });
  }
});

columnsRouter.post('/:id/articles', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const col = await getServices().column.getColumnById(req.params.id);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    if (col.authorId !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, summary, content, tags, postId } = req.body;
    const wordCount = content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 300));

    const article = await getServices().column.addArticleToColumn(req.params.id, {
      id: uuidv4(),
      title,
      summary: summary || '',
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      readTime,
      postId
    });

    res.json(article);
  } catch (err) {
    logger.error('发布文章错误:', err);
    res.status(500).json({ error: '发布文章失败' });
  }
});

columnsRouter.post('/:colId/articles/:artId/like', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await getServices().column.toggleArticleLike(req.params.colId, req.params.artId, user.id);
    if (!result) return res.status(404).json({ error: 'Article not found' });

    res.json(result);
  } catch (err) {
    logger.error('点赞文章错误:', err);
    res.status(500).json({ error: '点赞失败' });
  }
});

columnsRouter.post('/:id/follow', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await getServices().column.toggleFollow(req.params.id, user.id);
    if (!result) return res.status(404).json({ error: 'Column not found' });

    res.json(result);
  } catch (err) {
    logger.error('关注专栏错误:', err);
    res.status(500).json({ error: '关注失败' });
  }
});