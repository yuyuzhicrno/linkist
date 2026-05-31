import { jest } from '@jest/globals';
import { createMockRepo, createMockUserService, mockRepo } from '../__mocks__/services.js';
import { PostService } from '../../dist/services/PostService.js';

describe('PostService', () => {
  let postService;
  let mockRepoInstance;
  let mockUserService;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    mockUserService = createMockUserService();
    postService = new PostService(mockRepoInstance, mockUserService);

    mockRepo.data.posts = [];
    mockRepo.data.users = [];
    mockRepo.data.tags = [];
  });

  describe('createPost', () => {
    it('should create a post with required fields', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        authorId: 'author-1',
        category: '技术',
        tags: ['javascript', 'testing']
      };

      const result = await postService.createPost(postData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Post');
      expect(result.content).toBe('Test content');
      expect(result.authorId).toBe('author-1');
      expect(result.category).toBe('技术');
      expect(result.tags).toEqual(['javascript', 'testing']);
      expect(result.isPinned).toBe(false);
      expect(mockRepoInstance.createPost).toHaveBeenCalled();
    });

    it('should use default category when not provided', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        authorId: 'author-1'
      };

      const result = await postService.createPost(postData);

      expect(result.category).toBe('综合');
    });

    it('should upsert tags when creating post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        authorId: 'author-1',
        tags: ['nodejs']
      };

      await postService.createPost(postData);

      expect(mockRepoInstance.upsertTag).toHaveBeenCalledWith('nodejs', '#7c3aed');
    });
  });

  describe('getPosts', () => {
    it('should return posts from repo', async () => {
      mockRepo.data.posts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' }
      ];

      const result = await postService.getPosts();

      expect(result.posts).toHaveLength(2);
      expect(mockRepoInstance.posts).toHaveBeenCalled();
    });

    it('should pass options to repo', async () => {
      const options = { page: 1, limit: 10, authorId: 'author-1' };

      await postService.getPosts(options);

      expect(mockRepoInstance.posts).toHaveBeenCalledWith(options);
    });
  });

  describe('getPostById', () => {
    it('should return post by id', async () => {
      mockRepo.data.posts = [{ id: 'post-1', title: 'Test Post' }];
      mockRepoInstance.postById.mockResolvedValue(mockRepo.data.posts[0]);

      const result = await postService.getPostById('post-1');

      expect(result.id).toBe('post-1');
      expect(mockRepoInstance.postById).toHaveBeenCalledWith('post-1');
    });
  });

  describe('updatePost', () => {
    it('should update post and return updated post', async () => {
      const updatedPost = { id: 'post-1', title: 'Updated Title' };
      mockRepoInstance.updatePost.mockResolvedValue(updatedPost);

      const result = await postService.updatePost('post-1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(mockRepoInstance.updatePost).toHaveBeenCalledWith('post-1', { title: 'Updated Title' });
    });
  });

  describe('deletePost', () => {
    it('should delete post from repo', async () => {
      mockRepoInstance.deletePost.mockResolvedValue(true);

      const result = await postService.deletePost('post-1');

      expect(result).toBe(true);
      expect(mockRepoInstance.deletePost).toHaveBeenCalledWith('post-1');
    });
  });

  describe('vote', () => {
    beforeEach(() => {
      mockRepo.data.posts = [{
        id: 'post-1',
        authorId: 'author-1',
        upvotes: [],
        downvotes: []
      }];
      mockRepoInstance.postById.mockImplementation(async (id) => {
        return mockRepo.data.posts.find(p => p.id === id) || null;
      });
      mockRepoInstance.updatePost.mockImplementation(async (id, updates) => {
        const post = mockRepo.data.posts.find(p => p.id === id);
        if (post) Object.assign(post, updates);
        return post;
      });
      mockUserService.addXp.mockResolvedValue();
    });

    it('should add upvote when voteType is up', async () => {
      const result = await postService.vote('post-1', 'user-1', 'up');

      expect(mockRepoInstance.updatePost).toHaveBeenCalled();
      expect(mockUserService.addXp).toHaveBeenCalledWith('author-1', 10);
    });

    it('should remove upvote if already upvoted', async () => {
      mockRepo.data.posts[0].upvotes = ['user-1'];

      await postService.vote('post-1', 'user-1', 'up');

      expect(mockRepo.data.posts[0].upvotes).not.toContain('user-1');
    });

    it('should add downvote when voteType is down', async () => {
      await postService.vote('post-1', 'user-1', 'down');

      expect(mockRepo.data.posts[0].downvotes).toContain('user-1');
    });

    it('should throw error if post does not exist', async () => {
      mockRepoInstance.postById.mockResolvedValue(null);

      await expect(postService.vote('nonexistent', 'user-1', 'up'))
        .rejects.toThrow('帖子不存在');
    });
  });

  describe('addView', () => {
    it('should increment view count', async () => {
      mockRepo.data.posts = [{ id: 'post-1', views: 5 }];
      mockRepoInstance.postById.mockResolvedValue(mockRepo.data.posts[0]);
      mockRepoInstance.updatePost.mockImplementation(async (id, updates) => {
        const post = mockRepo.data.posts.find(p => p.id === id);
        if (post) Object.assign(post, updates);
        return post;
      });

      await postService.addView('post-1');

      expect(mockRepo.data.posts[0].views).toBe(6);
    });

    it('should throw error if post does not exist', async () => {
      mockRepoInstance.postById.mockResolvedValue(null);

      await expect(postService.addView('nonexistent'))
        .rejects.toThrow('帖子不存在');
    });
  });

  describe('addComment', () => {
    beforeEach(() => {
      mockRepo.data.posts = [{
        id: 'post-1',
        authorId: 'author-1',
        comments: []
      }];
      mockRepoInstance.postById.mockImplementation(async (id) => {
        return mockRepo.data.posts.find(p => p.id === id) || null;
      });
      mockRepoInstance.createComment.mockImplementation(async (comment) => {
        const post = mockRepo.data.posts.find(p => p.id === comment.postId);
        if (post) {
          post.comments.push(comment);
        }
        return comment;
      });
      mockUserService.addXp.mockResolvedValue();
    });

    it('should create comment and add XP to post author', async () => {
      const result = await postService.addComment('post-1', 'commenter-1', 'Great post!');

      expect(result.content).toBe('Great post!');
      expect(mockUserService.addXp).toHaveBeenCalledWith('author-1', 5);
    });

    it('should throw error if post does not exist', async () => {
      mockRepoInstance.postById.mockResolvedValue(null);

      await expect(postService.addComment('nonexistent', 'user-1', 'Comment'))
        .rejects.toThrow('帖子不存在');
    });
  });

  describe('getComments', () => {
    it('should return comments with replies', async () => {
      const comments = [
        { id: 'comment-1', content: 'Comment 1', replies: [] },
        { id: 'comment-2', content: 'Comment 2', replies: [] }
      ];
      mockRepoInstance.postComments.mockResolvedValue(comments);
      mockRepoInstance.commentReplies.mockResolvedValue([]);

      const result = await postService.getComments('post-1');

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.postComments).toHaveBeenCalledWith('post-1');
    });
  });

  describe('addReply', () => {
    it('should create reply', async () => {
      const reply = { id: 'reply-1', commentId: 'comment-1', content: 'Reply content' };
      mockRepoInstance.createReply.mockResolvedValue(reply);

      const result = await postService.addReply('comment-1', 'user-1', 'Reply content');

      expect(result.content).toBe('Reply content');
    });
  });

  describe('pinPost', () => {
    beforeEach(() => {
      mockRepo.data.posts = [{ id: 'post-1', authorId: 'author-1', isPinned: false }];
      mockRepo.data.users = [{ id: 'author-1', role: 'member' }];
      mockRepoInstance.postById.mockImplementation(async (id) => {
        return mockRepo.data.posts.find(p => p.id === id) || null;
      });
      mockRepoInstance.userById.mockImplementation(async (id) => {
        return mockRepo.data.users.find(u => u.id === id) || null;
      });
      mockRepoInstance.updatePost.mockImplementation(async (id, updates) => {
        const post = mockRepo.data.posts.find(p => p.id === id);
        if (post) Object.assign(post, updates);
        return post;
      });
    });

    it('should toggle pin status for post author', async () => {
      const result = await postService.pinPost('post-1', 'author-1');

      expect(mockRepo.data.posts[0].isPinned).toBe(true);
    });

    it('should allow admin to pin others post', async () => {
      mockRepo.data.users.push({ id: 'admin-user', role: 'admin' });

      await postService.pinPost('post-1', 'admin-user');

      expect(mockRepo.data.posts[0].isPinned).toBe(true);
    });

    it('should throw error if non-admin tries to pin others post', async () => {
      await expect(postService.pinPost('post-1', 'other-user'))
        .rejects.toThrow('没有权限置顶帖子');
    });
  });
});