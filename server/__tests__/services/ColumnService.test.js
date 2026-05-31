import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { ColumnService } from '../../dist/services/ColumnService.js';

describe('ColumnService', () => {
  let columnService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    columnService = new ColumnService(mockRepoInstance);

    mockRepo.data.columns = [];
    mockRepo.data.column_articles = [];
    mockRepo.data.column_posts = [];
    mockRepo.data.posts = [];
  });

  describe('getColumns', () => {
    it('should return columns from repo', async () => {
      mockRepo.data.columns = [
        { id: '1', title: 'Column 1' },
        { id: '2', title: 'Column 2' }
      ];

      const result = await columnService.getColumns();

      expect(result.columns).toHaveLength(2);
      expect(mockRepoInstance.columns).toHaveBeenCalled();
    });

    it('should pass options to repo', async () => {
      const options = { page: 1, limit: 10 };

      await columnService.getColumns(options);

      expect(mockRepoInstance.columns).toHaveBeenCalledWith(options);
    });
  });

  describe('getColumnById', () => {
    it('should return column by id', async () => {
      mockRepo.data.columns = [{ id: 'column-1', title: 'Test Column' }];
      mockRepoInstance.columnById.mockResolvedValue(mockRepo.data.columns[0]);

      const result = await columnService.getColumnById('column-1');

      expect(result.id).toBe('column-1');
      expect(mockRepoInstance.columnById).toHaveBeenCalledWith('column-1');
    });

    it('should return null when column not found', async () => {
      mockRepoInstance.columnById.mockResolvedValue(null);

      const result = await columnService.getColumnById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getColumnBySlug', () => {
    it('should return column by slug', async () => {
      mockRepoInstance.columnBySlug.mockResolvedValue({ id: 'column-1', slug: 'test-column' });

      const result = await columnService.getColumnBySlug('test-column');

      expect(result.slug).toBe('test-column');
      expect(mockRepoInstance.columnBySlug).toHaveBeenCalledWith('test-column');
    });
  });

  describe('createColumn', () => {
    it('should create a column with required fields', async () => {
      const columnData = {
        title: 'My Column',
        authorId: 'user-1'
      };

      const result = await columnService.createColumn(columnData);

      expect(result).toBeDefined();
      expect(result.title).toBe('My Column');
      expect(result.slug).toBe('my-column');
      expect(result.authorId).toBe('user-1');
      expect(mockRepoInstance.createColumn).toHaveBeenCalled();
    });

    it('should set default cover color when not provided', async () => {
      const result = await columnService.createColumn({
        title: 'Test Column',
        authorId: 'user-1'
      });

      expect(result.coverColor).toBe('#7c3aed');
    });

    it('should generate correct slug from title', async () => {
      const result = await columnService.createColumn({
        title: 'My Test Column Title',
        authorId: 'user-1'
      });

      expect(result.slug).toBe('my-test-column-title');
    });
  });

  describe('addArticleToColumn', () => {
    it('should add an article to a column', async () => {
      mockRepo.data.columns = [{ id: 'column-1', title: 'Test Column' }];
      mockRepoInstance.columnById.mockResolvedValue(mockRepo.data.columns[0]);

      const articleData = {
        title: 'Test Article',
        content: 'This is test content',
        authorId: 'user-1'
      };

      const result = await columnService.addArticleToColumn('column-1', articleData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Article');
      expect(result.columnId).toBe('column-1');
      expect(mockRepoInstance.addColumnArticle).toHaveBeenCalled();
    });

    it('should set default summary from content', async () => {
      mockRepo.data.columns = [{ id: 'column-1', title: 'Test Column' }];
      mockRepoInstance.columnById.mockResolvedValue(mockRepo.data.columns[0]);

      const articleData = {
        title: 'Test Article',
        content: 'This is test content that is longer than 100 characters to test the summary truncation feature in the column service',
        authorId: 'user-1'
      };

      const result = await columnService.addArticleToColumn('column-1', articleData);

      expect(result.summary).toBeDefined();
    });
  });

  describe('getColumnArticle', () => {
    it('should return article by id', async () => {
      mockRepo.data.column_articles = [{ id: 'article-1', columnId: 'column-1', title: 'Test Article' }];
      mockRepoInstance.getColumnArticle.mockResolvedValue(mockRepo.data.column_articles[0]);

      const result = await columnService.getColumnArticle('column-1', 'article-1');

      expect(result.id).toBe('article-1');
      expect(mockRepoInstance.getColumnArticle).toHaveBeenCalledWith('column-1', 'article-1');
    });

    it('should return null when article not found', async () => {
      mockRepoInstance.getColumnArticle.mockResolvedValue(null);

      const result = await columnService.getColumnArticle('column-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('toggleArticleLike', () => {
    it('should toggle article like', async () => {
      mockRepo.data.column_articles = [{ id: 'article-1', columnId: 'column-1', likes: [] }];
      mockRepoInstance.toggleColumnArticleLike.mockResolvedValue({ ...mockRepo.data.column_articles[0], likes: ['user-1'] });

      const result = await columnService.toggleArticleLike('column-1', 'article-1', 'user-1');

      expect(mockRepoInstance.toggleColumnArticleLike).toHaveBeenCalledWith('column-1', 'article-1', 'user-1');
    });
  });

  describe('toggleFollow', () => {
    it('should toggle column follow', async () => {
      mockRepo.data.columns = [{ id: 'column-1', followers: [] }];
      mockRepoInstance.toggleColumnFollow.mockResolvedValue({ followed: true, followers: ['user-1'] });

      const result = await columnService.toggleFollow('column-1', 'user-1');

      expect(mockRepoInstance.toggleColumnFollow).toHaveBeenCalledWith('column-1', 'user-1');
    });
  });

  describe('columnPosts', () => {
    it('should return posts from column', async () => {
      mockRepo.data.posts = [{ id: 'post-1' }, { id: 'post-2' }];
      mockRepo.data.column_posts = [{ columnId: 'column-1', postId: 'post-1' }, { columnId: 'column-1', postId: 'post-2' }];
      mockRepoInstance.columnPosts.mockResolvedValue([{ id: 'post-1' }, { id: 'post-2' }]);

      const result = await columnService.columnPosts('column-1');

      expect(result.posts).toHaveLength(2);
      expect(mockRepoInstance.columnPosts).toHaveBeenCalledWith('column-1', {});
    });

    it('should pass options to repo', async () => {
      const options = { limit: 10, offset: 5 };

      await columnService.columnPosts('column-1', options);

      expect(mockRepoInstance.columnPosts).toHaveBeenCalledWith('column-1', options);
    });
  });
});