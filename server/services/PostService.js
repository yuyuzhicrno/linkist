import { v4 as uuidv4 } from 'uuid';
import { db, addXp, syncTagCount, flushDatabase, recordDbOp } from '../data/db.js';
import { createNotification } from '../routes/notifications.js';

export class PostService {
  createPost({ title, content, authorId, category = '综合', tags = [], flair = '' }) {
    const post = {
      id: uuidv4(),
      title,
      content,
      authorId,
      category,
      tags,
      flair,
      upvotes: [],
      downvotes: [],
      views: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isPinned: false,
      pollId: null
    };

    db.data.posts.push(post);
    recordDbOp('insert', 'posts', post.id, post);

    syncTagCount();

    const author = db.data.users.find(u => u.id === authorId);
    if (author) {
      addXp(authorId, 5);
    }

    flushDatabase();

    return post;
  }

  getPostById(id) {
    return db.data.posts.find(p => p.id === id) || null;
  }

  getAllPosts(options = {}) {
    const { page = 1, limit = 20, channelId, tag } = options;
    let posts = [...db.data.posts];

    if (channelId) {
      posts = posts.filter(p => p.channelId === channelId);
    }

    if (tag) {
      posts = posts.filter(p => p.tags.includes(tag));
    }

    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return {
      posts: paginatedPosts.map(p => this.enrichPost(p)),
      total: posts.length,
      page,
      limit
    };
  }

  updatePost(id, updates, userId, userRole = 'member') {
    const post = db.data.posts.find(p => p.id === id);
    if (!post) {
      throw new Error('帖子不存在');
    }

    if (post.authorId !== userId && userRole !== 'admin') {
      throw new Error('无权修改此帖子');
    }

    if (updates.title !== undefined) post.title = updates.title;
    if (updates.content !== undefined) post.content = updates.content;
    if (updates.category !== undefined) post.category = updates.category;
    if (updates.tags !== undefined) post.tags = updates.tags;
    if (updates.flair !== undefined) post.flair = updates.flair;

    post.updatedAt = new Date().toISOString();
    recordDbOp('update', 'posts', post.id);
    flushDatabase();

    return post;
  }

  deletePost(id, userId, userRole = 'member') {
    const idx = db.data.posts.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error('帖子不存在');
    }

    if (db.data.posts[idx].authorId !== userId && userRole !== 'admin') {
      throw new Error('无权删除此帖子');
    }

    db.data.posts.splice(idx, 1);
    recordDbOp('delete', 'posts', id);
    flushDatabase();

    return true;
  }

  vote(postId, userId, voteType) {
    const post = db.data.posts.find(p => p.id === postId);
    if (!post) {
      throw new Error('帖子不存在');
    }

    const wasUp = post.upvotes.includes(userId);
    const wasDown = post.downvotes.includes(userId);

    if (voteType === 'up') {
      if (wasUp) {
        post.upvotes = post.upvotes.filter(id => id !== userId);
      } else {
        post.upvotes.push(userId);
        post.downvotes = post.downvotes.filter(id => id !== userId);
        addXp(userId, 1);
        addXp(post.authorId, 2);
        if (post.authorId !== userId) {
          createNotification(post.authorId, 'upvote', '有人赞了你的帖子', `用户赞了你的帖子「${post.title}」`, { postId: post.id });
        }
      }
    } else if (voteType === 'down') {
      if (wasDown) {
        post.downvotes = post.downvotes.filter(id => id !== userId);
      } else {
        post.downvotes.push(userId);
        post.upvotes = post.upvotes.filter(id => id !== userId);
      }
    }

    recordDbOp('update', 'posts', post.id);
    flushDatabase();

    return {
      upvotes: post.upvotes.length,
      downvotes: post.downvotes.length,
      voteCount: post.upvotes.length - post.downvotes.length
    };
  }

  addComment(postId, { content, authorId }) {
    const post = db.data.posts.find(p => p.id === postId);
    if (!post) {
      throw new Error('帖子不存在');
    }

    const comment = {
      id: uuidv4(),
      authorId,
      content,
      upvotes: [],
      downvotes: [],
      replies: [],
      createdAt: new Date().toISOString()
    };

    post.comments.push(comment);
    recordDbOp('update', 'posts', post.id);

    addXp(authorId, 3);
    addXp(post.authorId, 1);
    if (post.authorId !== authorId) {
      createNotification(post.authorId, 'comment', '有人评论了你的帖子', `用户评论了你的帖子「${post.title}」`, { postId: post.id, commentId: comment.id });
    }

    flushDatabase();

    return comment;
  }

  addReply(postId, commentId, { content, authorId }) {
    const post = db.data.posts.find(p => p.id === postId);
    if (!post) {
      throw new Error('帖子不存在');
    }

    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) {
      throw new Error('评论不存在');
    }

    const reply = {
      id: uuidv4(),
      authorId,
      content,
      createdAt: new Date().toISOString()
    };

    comment.replies.push(reply);
    recordDbOp('update', 'posts', post.id);

    addXp(authorId, 2);
    addXp(comment.authorId, 1);
    if (comment.authorId !== authorId) {
      createNotification(comment.authorId, 'reply', '有人回复了你的评论', `用户回复了你的评论`, { postId, commentId, replyId: reply.id });
    }

    flushDatabase();

    return reply;
  }

  pinPost(id, userId, userRole = 'member') {
    const post = db.data.posts.find(p => p.id === id);
    if (!post) {
      throw new Error('帖子不存在');
    }

    if (post.authorId !== userId && userRole !== 'admin') {
      throw new Error('只有帖子作者或管理员可以置顶帖子');
    }

    post.isPinned = !post.isPinned;
    recordDbOp('update', 'posts', post.id);
    flushDatabase();

    return post.isPinned;
  }

  enrichPost(post) {
    const author = db.data.users.find(u => u.id === post.authorId);
    return {
      ...post,
      author: author ? {
        id: author.id,
        username: author.username,
        avatar: author.avatar,
        role: author.role
      } : null
    };
  }
}

export const postService = new PostService();