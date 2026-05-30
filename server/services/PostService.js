import { v4 as uuidv4 } from 'uuid';

export class PostService {
  constructor(repo, userService) {
    this.repo = repo;
    this.userService = userService;
  }

  async createPost({ title, content, authorId, category = '综合', tags = [], flair = '', channelId = null }) {
    const post = {
      id: uuidv4(),
      title,
      content,
      authorId,
      category,
      tags,
      flair,
      channelId,
      isPinned: false
    };

    const created = await this.repo.createPost(post);

    for (const tag of tags) {
      await this.repo.upsertTag(tag, '#7c3aed');
    }

    return created;
  }

  async getPosts(options = {}) {
    return await this.repo.posts(options);
  }

  async getPostById(id) {
    return await this.repo.postById(id);
  }

  async updatePost(id, updates) {
    return await this.repo.updatePost(id, updates);
  }

  async deletePost(id) {
    return await this.repo.deletePost(id);
  }

  async vote(postId, userId, voteType) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    let upvotes = post.upvotes || [];
    let downvotes = post.downvotes || [];

    if (voteType === 'up') {
      if (upvotes.includes(userId)) {
        upvotes = upvotes.filter(id => id !== userId);
      } else {
        upvotes.push(userId);
        downvotes = downvotes.filter(id => id !== userId);
        await this.userService.addXp(post.authorId, 10);
      }
    } else if (voteType === 'down') {
      if (downvotes.includes(userId)) {
        downvotes = downvotes.filter(id => id !== userId);
      } else {
        downvotes.push(userId);
        upvotes = upvotes.filter(id => id !== userId);
      }
    }

    return await this.repo.updatePost(postId, { upvotes, downvotes });
  }

  async addView(postId) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');
    return await this.repo.updatePost(postId, { views: (post.views || 0) + 1 });
  }

  async addComment(postId, authorId, content) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    const comment = await this.repo.createComment({
      id: uuidv4(),
      postId,
      authorId,
      content
    });

    await this.userService.addXp(post.authorId, 5);

    return comment;
  }

  async getComments(postId) {
    const comments = await this.repo.postComments(postId);
    for (const comment of comments) {
      comment.replies = await this.repo.commentReplies(comment.id);
    }
    return comments;
  }

  async addReply(commentId, authorId, content) {
    const reply = await this.repo.createReply({
      id: uuidv4(),
      commentId,
      authorId,
      content
    });
    return reply;
  }

  async voteComment(commentId, userId, voteType) {
    return await this.repo.commentUpvote(commentId, userId);
  }

  async pinPost(postId, userId) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    if (post.authorId !== userId) {
      const user = await this.repo.userById(userId);
      if (!user || user.role !== 'admin') {
        throw new Error('没有权限置顶帖子');
      }
    }

    return await this.repo.updatePost(postId, { isPinned: !post.isPinned });
  }
}