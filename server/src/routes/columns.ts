import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { getUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { Column, ColumnArticle, User } from '../types/index';

interface Author {
  id: string;
  username: string;
  avatar: string | null;
}

interface EnrichedColumn extends Column {
  author: Author | null;
}

interface EnrichedArticle extends ColumnArticle {
  column?: {
    id: string;
    title: string;
    author: Author | null;
  };
}

export const columnsRouter = Router();

columnsRouter.get('/', asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  const { columns } = await getServices().column.getColumns();
  const enriched = await Promise.all(columns.map(async (col: Column) => {
    const author = await getServices().user.getUserById(col.authorId);
    return {
      ...col,
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null
    } as EnrichedColumn;
  }));
  res.json(enriched);
}));

columnsRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  let col = await getServices().column.getColumnById(req.params.id as string);
  if (!col) {
    col = await getServices().column.getColumnBySlug(req.params.id as string);
  }

  if (!col) {
    throw new AppError('Column not found', 404, 'NOT_FOUND');
  }

  const author = await getServices().user.getUserById(col.authorId);
  const articlesResult = await getServices().column.columnPosts(req.params.id as string);

  res.json({
    ...col,
    author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
    articles: articlesResult.posts
  });
}));

columnsRouter.post('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { title, description, coverColor } = req.body as {
    title?: string;
    description?: string;
    coverColor?: string;
  };
  if (!title) {
    throw new AppError('Title required', 400, 'VALIDATION_ERROR');
  }

  const col = await getServices().column.createColumn({
    title,
    description: description || '',
    coverColor: coverColor || '#7c3aed',
    authorId: user.id
  });

  res.json(col);
}));

columnsRouter.get('/:colId/articles/:artId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const article = await getServices().column.getColumnArticle(req.params.colId as string, req.params.artId as string);
  if (!article) {
    throw new AppError('Article not found', 404, 'NOT_FOUND');
  }

  const col = await getServices().column.getColumnById(req.params.colId as string);
  const author = await getServices().user.getUserById(col!.authorId);
  res.json({
    ...article,
    column: {
      id: col!.id,
      title: col!.title,
      author: author ? { id: author.id, username: author.username } : null
    }
  } as EnrichedArticle);
}));

columnsRouter.post('/:id/articles', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const col = await getServices().column.getColumnById(req.params.id as string);
  if (!col) {
    throw new AppError('Column not found', 404, 'NOT_FOUND');
  }
  if (col.authorId !== user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const { title, summary, content, tags } = req.body as {
    title?: string;
    summary?: string;
    content?: string;
    tags?: string[];
  };

  const article = await getServices().column.addArticleToColumn(req.params.id as string, {
    title: title || '',
    summary: summary || '',
    content: content || '',
    authorId: user.id,
    tags: Array.isArray(tags) ? tags : []
  });

  res.json(article);
}));

columnsRouter.post('/:colId/articles/:artId/like', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await getServices().column.toggleArticleLike(req.params.colId as string, req.params.artId as string, user.id);
  if (!result) {
    throw new AppError('Article not found', 404, 'NOT_FOUND');
  }

  res.json(result);
}));

columnsRouter.post('/:id/follow', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await getUser(req) as User;
  if (!user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await getServices().column.toggleFollow(req.params.id as string, user.id);
  if (!result) {
    throw new AppError('Column not found', 404, 'NOT_FOUND');
  }

  res.json(result);
}));