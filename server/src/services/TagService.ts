import type { Repository } from '../repository';
import type { Tag, Post } from '../types';

export class TagService {
  constructor(private repo: Repository) {}

  async getAllTags(): Promise<Tag[]> {
    return await this.repo.tags() as Tag[];
  }

  async upsertTag(name: string, color: string): Promise<Tag> {
    return await this.repo.upsertTag(name, color) as Tag;
  }

  async updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null> {
    return await this.repo.updateTag(name, updates) as Tag | null;
  }

  async getPostsByTag(tag: string, options: { page?: number; limit?: number } = {}): Promise<{ posts: Post[]; total: number }> {
    return await this.repo.posts({ ...options, tag }) as { posts: Post[]; total: number };
  }
}