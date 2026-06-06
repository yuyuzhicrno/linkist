import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services-registry';
import { validate, schemas, sanitizeInput } from '../middleware/validation';
import { authenticateWithUser } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import type { User, Post, Comment, Reply } from '../types/index';

interface Author {
  id: string;
  username: string;
  avatar: string | null;
  xp: number;
}

interface EnrichedPost extends Post {
  author: Author | null;
  voteCount: number;
  commentCount: number;
  comments?: Comment[];
}

interface EnrichedComment extends Comment {
  author: Author | null;
  voteCount: number;
  replies: EnrichedReply[];
}

interface EnrichedReply extends Reply {
  author: Author | null;
  voteCount: number;
}

interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

const getAuthor = async (authorId: string): Promise<Author | null> => {
  const u = await getServices().user.getUserById(authorId);
  if (!u) return null;
  return { id: u.id, username: u.username, avatar: u.avatar, xp: u.xp || 0 };
};

const enrichPost = async (post: Post): Promise<EnrichedPost> => ({
  ...post,
  author: await getAuthor(post.authorId),
  voteCount: (post.upvotes?.length || 0) - (post.downvotes?.length || 0),
  commentCount: (post.commentCount || 0)
});

const enrichComment = async (c: Comment): Promise<EnrichedComment> => ({
  ...c,
  author: await getAuthor(c.authorId),
  voteCount: ((c.upvotes || []).length || 0) - ((c.downvotes || []).length || 0),
  replies: await Promise.all((c.replies || []).map(async (r: Reply) => ({
    ...r,
    author: await getAuthor(r.authorId),
    voteCount: ((r.upvotes || []).length || 0) - ((r.downvotes || []).length || 0)
  })))
});

export const postsRouter = Router();

postsRouter.get('/', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { sort = 'hot', category, tag, search, page = 1, limit = 20 } = req.query as Record<string, string>;

  let postsResult = await getServices().post.getPosts({ page: Number(page), limit: Number(limit) });
  let posts: Post[] = Array.isArray(postsResult) ? postsResult : (postsResult.posts || []);

  if (category) posts = posts.filter(p => p.category === category);
  if (tag) posts = posts.filter(p => (p.tags || []).includes(tag));
  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }

  if (sort === 'hot') posts.sort((a, b) => ((b.upvotes?.length || 0) - (b.downvotes?.length || 0)) - ((a.upvotes?.length || 0) - (a.downvotes?.length || 0)));
  else if (sort === 'new') posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sort === 'top') posts.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));

  const enrichedPosts = await Promise.all(posts.map(enrichPost));
  res.json(enrichedPosts);
}));

postsRouter.get('/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const post = await getServices().post.getPostById(req.params.id as string);
  if (!post) {
    throw new AppError('Post not found', 404, 'NOT_FOUND');
  }

  await getServices().post.addView(req.params.id as string);

  const enriched = await enrichPost(post);
  enriched.comments = await getServices().post.getComments(req.params.id as string);

  res.json(enriched);
}));

postsRouter.post('/', validate(schemas.createPost), authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { title, content, category, tags, flair } = req.body as {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    flair?: string;
  };

  const post = await getServices().post.createPost({
    title: sanitizeInput(title) || '',
    content: sanitizeInput(content) || '',
    authorId: authReq.user!.id,
    category: sanitizeInput(category || '') || '综合',
    tags: Array.isArray(tags) ? tags.map(t => sanitizeInput(t) || '') : [],
    flair: sanitizeInput(flair || '') || ''
  });

  await getServices().user.addXp(authReq.user!.id, 10);

  res.json(await enrichPost(post));
}));

postsRouter.post('/:id/vote', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { type } = req.body as { type: 'up' | 'down' };
  const post = await getServices().post.vote(req.params.id as string, authReq.user!.id, type);

  if (type === 'up' && post) {
    await getServices().user.addXp(authReq.user!.id, 1);
    await getServices().notification.createPostNotification(req.params.id as string, post.authorId, authReq.user!.id, authReq.user!.username, 'upvote');
  }

  res.json({
    upvotes: post?.upvotes || [],
    downvotes: post?.downvotes || [],
    voteCount: ((post?.upvotes?.length || 0) - (post?.downvotes?.length || 0))
  });
}));

postsRouter.post('/:id/comments', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    throw new AppError('Content required', 400, 'VALIDATION_ERROR');
  }

  const comment = await getServices().post.addComment(req.params.id as string, authReq.user!.id, content.trim());

  await getServices().user.addXp(authReq.user!.id, 3);

  const post = await getServices().post.getPostById(req.params.id as string);
  if (post && post.authorId !== authReq.user!.id) {
    await getServices().notification.createPostNotification(req.params.id as string, post.authorId, authReq.user!.id, authReq.user!.username, 'comment');
  }

  res.json(await enrichComment(comment));
}));

postsRouter.post('/:id/comments/:commentId/replies', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    throw new AppError('Content required', 400, 'VALIDATION_ERROR');
  }

  const reply = await getServices().post.addReply(req.params.commentId as string, authReq.user!.id, content.trim());

  await getServices().user.addXp(authReq.user!.id, 2);

  const comments = await getServices().post.getComments(req.params.id as string);
  const comment = comments.find(c => c.id === req.params.commentId);
  if (comment && comment.authorId !== authReq.user!.id) {
    await getServices().notification.createNotification(
      comment.authorId,
      'reply',
      '有人回复了你的评论',
      `${authReq.user!.username} 回复了你的评论`,
      { postId: req.params.id, commentId: req.params.commentId }
    );
  }

  res.json({
    ...reply,
    author: { id: authReq.user!.id, username: authReq.user!.username, avatar: authReq.user!.avatar }
  });
}));

postsRouter.post('/:id/comments/:commentId/vote', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { type } = req.body as { type?: string };
  if (type !== 'up' && type !== 'down') {
    throw new AppError('Invalid vote type. Must be "up" or "down"', 400, 'VALIDATION_ERROR');
  }
  const comment = await getServices().post.voteComment(req.params.commentId as string, authReq.user!.id, type);
  if (!comment) {
    throw new AppError('Comment not found', 404, 'NOT_FOUND');
  }

  if (type === 'up') {
    await getServices().user.addXp(comment.authorId, 1);
  }

  res.json({
    upvotes: comment.upvotes?.length || 0,
    downvotes: comment.downvotes?.length || 0
  });
}));

postsRouter.put('/:id/comments/:commentId', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { content } = req.body as { content?: string };
  if (content === undefined || !content?.trim()) {
    throw new AppError('Content required', 400, 'VALIDATION_ERROR');
  }

  const comment = await getServices().post.updateComment(
    req.params.commentId as string,
    authReq.user!.id,
    authReq.user!.role,
    content
  );

  res.json(await enrichComment(comment));
}));

postsRouter.delete('/:id/comments/:commentId', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  await getServices().post.deleteComment(
    req.params.commentId as string,
    authReq.user!.id,
    authReq.user!.role
  );

  res.json({ success: true });
}));

postsRouter.put('/:id', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const post = await getServices().post.getPostById(req.params.id as string);
  if (!post) {
    throw new AppError('Post not found', 404, 'NOT_FOUND');
  }

  if (post.authorId !== authReq.user!.id && authReq.user!.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const { title, content, category, tags, flair } = req.body as {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    flair?: string;
  };
  const updates: Partial<Post> = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (category !== undefined) updates.category = category;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : post.tags;
  if (flair !== undefined) updates.flair = flair;

  const updated = await getServices().post.updatePost(req.params.id as string, updates);
  res.json(await enrichPost(updated!));
}));

postsRouter.delete('/:id', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const post = await getServices().post.getPostById(req.params.id as string);
  if (!post) {
    throw new AppError('Not found', 404, 'NOT_FOUND');
  }

  if (post.authorId !== authReq.user!.id && authReq.user!.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  await getServices().post.deletePost(req.params.id as string);
  res.json({ success: true });
}));

postsRouter.patch('/:id/pin', authenticateWithUser, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const post = await getServices().post.pinPost(req.params.id as string, authReq.user!.id);
  res.json({ success: true, isPinned: post?.isPinned ?? false });
}));