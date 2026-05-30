import { Router } from 'express';
import { getServices } from '../services-registry.js';
import { getUser } from './auth.js';

export const dbRouter = Router();

dbRouter.get('/stats', async (req, res) => {
  try {
    const postsResult = await getServices().post.getPosts();
    const totalPosts = postsResult.total;
    
    const users = await getServices().user.getAllUsers();
    const totalUsers = users.length;
    
    const channels = await getServices().channel.getChannels();
    const totalChannels = channels.length;
    
    const totalMessages = channels.reduce((s, c) => s + (c.messages?.length || 0), 0);
    
    const allTags = postsResult.posts.flatMap(p => p.tags || []);
    const tagCounts = {};
    allTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const hotPosts = postsResult.posts
      .filter(p => !p.isPinned)
      .sort((a, b) => (b.upvotes?.length - b.downvotes?.length) - (a.upvotes?.length - a.downvotes?.length))
      .slice(0, 5)
      .map(async p => {
        const author = await getServices().user.getUserById(p.authorId);
        return { id: p.id, title: p.title, voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0), author: author?.username };
      });

    const resolvedHotPosts = await Promise.all(hotPosts);

    res.json({ totalPosts, totalUsers, totalChannels, totalMessages, trendingTags, hotPosts: resolvedHotPosts });
  } catch (err) {
    console.error('获取统计数据错误:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

dbRouter.get('/categories', async (req, res) => {
  try {
    const postsResult = await getServices().post.getPosts();
    const cats = [...new Set(postsResult.posts.map(p => p.category))];
    
    res.json(cats.map(c => ({
      name: c,
      count: postsResult.posts.filter(p => p.category === c).length
    })));
  } catch (err) {
    console.error('获取分类错误:', err);
    res.status(500).json({ error: '获取分类失败' });
  }
});