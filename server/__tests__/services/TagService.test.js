import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { TagService } from '../../dist/services/TagService.js';

describe('TagService', () => {
  let tagService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    tagService = new TagService(mockRepoInstance);

    mockRepo.data.tags = [];
    mockRepo.data.columns = [];
    mockRepo.data.posts = [];
  });

  describe('getAllTags', () => {
    it('should return all tags from repo', async () => {
      mockRepo.data.tags = [
        { name: 'javascript', count: 10, color: '#f7df1e' },
        { name: 'python', count: 5, color: '#3776ab' }
      ];

      const result = await tagService.getAllTags();

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.tags).toHaveBeenCalled();
    });
  });

  describe('upsertTag', () => {
    it('should upsert tag with name and color', async () => {
      mockRepoInstance.upsertTag.mockResolvedValue({ name: 'javascript', count: 1, color: '#f7df1e' });

      const result = await tagService.upsertTag('javascript', '#f7df1e');

      expect(result.name).toBe('javascript');
      expect(mockRepoInstance.upsertTag).toHaveBeenCalledWith('javascript', '#f7df1e');
    });
  });

  describe('updateTag', () => {
    it('should update tag', async () => {
      const updates = { color: '#00ff00', count: 100 };
      mockRepoInstance.updateTag.mockResolvedValue({ name: 'javascript', ...updates });

      const result = await tagService.updateTag('javascript', updates);

      expect(result.color).toBe('#00ff00');
      expect(result.count).toBe(100);
      expect(mockRepoInstance.updateTag).toHaveBeenCalledWith('javascript', updates);
    });

    it('should return null when tag not found', async () => {
      mockRepoInstance.updateTag.mockResolvedValue(null);

      const result = await tagService.updateTag('non-existent', { color: '#ff0000' });

      expect(result).toBeNull();
    });
  });

  describe('getPostsByTag', () => {
    it('should return posts filtered by tag', async () => {
      const postsResult = {
        posts: [{ id: '1', title: 'Post 1', tags: ['javascript'] }],
        total: 1
      };
      mockRepoInstance.posts.mockResolvedValue(postsResult);

      const result = await tagService.getPostsByTag('javascript');

      expect(result.posts).toHaveLength(1);
      expect(mockRepoInstance.posts).toHaveBeenCalledWith({ tag: 'javascript' });
    });

    it('should pass pagination options to repo', async () => {
      const postsResult = { posts: [], total: 0 };
      mockRepoInstance.posts.mockResolvedValue(postsResult);
      const options = { page: 2, limit: 10 };

      await tagService.getPostsByTag('javascript', options);

      expect(mockRepoInstance.posts).toHaveBeenCalledWith({ tag: 'javascript', ...options });
    });
  });
});