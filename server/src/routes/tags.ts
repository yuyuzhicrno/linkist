import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { Post, ColumnArticle } from '../types/index';

interface Author {
  id: string;
  username: string;
  avatar: string | null;
}

interface PostItem {
  type: 'post';
  id: string;
  title: string;
  author: Author | null;
  voteCount: number;
  commentCount: number;
  createdAt: string;
}

interface ArticleItem {
  type: 'article';
  id: string;
  columnId: string;
  title: string;
  summary: string;
  author: Author | null;
  likes: number;
  readTime: number;
  createdAt: string;
}

interface TagContent {
  tag: string;
  total: number;
  items: (PostItem | ArticleItem)[];
}

export const tagsRouter = Router();

tagsRouter.get('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { q, limit = 50 } = req.query as { q?: string; limit?: string };
  let tags = await getServices().tag.getAllTags();

  if (q) tags = tags.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
  tags.sort((a, b) => (b.count || 0) - (a.count || 0));

  res.json(tags.slice(0, Number(limit)));
}));

tagsRouter.get('/:tag/content', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const tag = decodeURIComponent(req.params.tag as string);
  const posts = await getServices().tag.getPostsByTag(tag);

  const postsList = Array.isArray(posts) ? posts : posts.posts;
  const enrichedPosts = await Promise.all(postsList.map(async (p: Post) => {
    const author = await getServices().user.getUserById(p.authorId);
    return {
      type: 'post' as const,
      id: p.id,
      title: p.title,
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
      voteCount: (p.upvotes?.length || 0) - (p.downvotes?.length || 0),
      commentCount: (p.commentCount || 0),
      createdAt: p.createdAt
    };
  }));

  const columnsResult = await getServices().column.getColumns();
  const columns = Array.isArray(columnsResult) ? columnsResult : columnsResult.columns;
  const articles: ArticleItem[] = [];
  for (const col of columns) {
    const colArticles = (col as { articles?: ColumnArticle[] }).articles || [];
    for (const a of colArticles) {
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
          createdAt: a.createdAt || ''
        });
      }
    }
  }

  const all = [...enrichedPosts, ...articles].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ tag, total: all.length, items: all } as TagContent);
}));