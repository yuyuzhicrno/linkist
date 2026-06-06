import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { asyncHandler } from '../middleware/errorHandler';
import type { Post } from '../types/index';

interface TrendingTag {
  tag: string;
  count: number;
}

interface HotPost {
  id: string;
  title: string;
  voteCount: number;
  author: string | undefined;
}

interface Stats {
  totalPosts: number;
  totalUsers: number;
  totalChannels: number;
  totalMessages: number;
  trendingTags: TrendingTag[];
  hotPosts: HotPost[];
}

export const dbRouter = Router();

dbRouter.get('/stats', asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  const postsResult = await getServices().post.getPosts();
  const totalPosts = postsResult.total;

  const users = await getServices().user.getAllUsers();
  const totalUsers = users.length;

  const channels = await getServices().channel.getChannels();
  const totalChannels = channels.length;
  const totalMessages = channels.reduce((s, c) => s + (c.messageCount || 0), 0);

  const postsList = Array.isArray(postsResult) ? postsResult : postsResult.posts;
  const allTags = postsList.flatMap((p: Post) => p.tags || []);
  const tagCounts: Record<string, number> = {};
  allTags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const hotPosts = postsList
    .filter((p: Post) => !p.isPinned)
    .sort((a, b) => ((b.upvotes?.length || 0) - (b.downvotes?.length || 0)) - ((a.upvotes?.length || 0) - (a.downvotes?.length || 0)))
    .slice(0, 5)
    .map(async (p: Post) => {
      const author = await getServices().user.getUserById(p.authorId);
      return {
        id: p.id,
        title: p.title,
        voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0),
        author: author?.username
      };
    });

  const resolvedHotPosts = await Promise.all(hotPosts);

  res.json({
    totalPosts,
    totalUsers,
    totalChannels,
    totalMessages,
    trendingTags,
    hotPosts: resolvedHotPosts
  } as Stats);
}));

dbRouter.get('/categories', asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  const postsResult = await getServices().post.getPosts();
  const postsList = Array.isArray(postsResult) ? postsResult : postsResult.posts;
  const cats = [...new Set(postsList.map((p: Post) => p.category))];

  res.json(cats.map(c => ({
    name: c,
    count: postsList.filter((p: Post) => p.category === c).length
  })));
}));