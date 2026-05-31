import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Column, ColumnArticle, Post } from '../types';

export class ColumnService {
  constructor(private repo: Repository) {}

  async getColumns(options: { page?: number; limit?: number } = {}): Promise<{ columns: Column[]; total: number }> {
    const result = await this.repo.columns(options);
    if (Array.isArray(result)) {
      return { columns: result as Column[], total: result.length };
    }
    return result as { columns: Column[]; total: number };
  }

  async getColumnById(id: string): Promise<Column | null> {
    return await this.repo.columnById(id) as Column | null;
  }

  async getColumnBySlug(slug: string): Promise<Column | null> {
    return await this.repo.columnBySlug(slug) as Column | null;
  }

  async createColumn({ title, description, coverColor, authorId }: {
    title: string;
    description?: string;
    coverColor?: string;
    authorId: string;
  }): Promise<Column> {
    const column: Column = {
      id: uuidv4(),
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: description || '',
      authorId,
      coverColor: coverColor || '#7c3aed',
      followers: []
    };

    return await this.repo.createColumn(column) as Column;
  }

  async addArticleToColumn(columnId: string, article: { title: string; content: string; authorId: string; summary?: string; tags?: string[] }): Promise<ColumnArticle> {
    const columnArticle: ColumnArticle = {
      id: uuidv4(),
      columnId,
      title: article.title,
      summary: article.summary || article.content.substring(0, 100),
      content: article.content,
      tags: article.tags || [],
      likes: [],
      views: 0,
      readTime: Math.ceil(article.content.length / 1000)
    };

    return await this.repo.addColumnArticle(columnId, columnArticle) as ColumnArticle;
  }

  async getColumnArticle(columnId: string, articleId: string): Promise<ColumnArticle | null> {
    return await this.repo.getColumnArticle(columnId, articleId) as ColumnArticle | null;
  }

  async toggleArticleLike(columnId: string, articleId: string, userId: string): Promise<ColumnArticle | null> {
    return await this.repo.toggleColumnArticleLike(columnId, articleId, userId) as ColumnArticle | null;
  }

  async toggleFollow(columnId: string, userId: string): Promise<{ followed: boolean; followers: string[] }> {
    return await this.repo.toggleColumnFollow(columnId, userId) as { followed: boolean; followers: string[] };
  }

  async columnPosts(columnId: string, options: { page?: number; limit?: number } = {}): Promise<{ posts: Post[]; total: number }> {
    const result = await this.repo.columnPosts(columnId, options);
    if (Array.isArray(result)) {
      return { posts: result as Post[], total: result.length };
    }
    return result as { posts: Post[]; total: number };
  }
}