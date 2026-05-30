import type { Repository } from '../repository';
import type { Tag } from '../types';

export class TagService {
  constructor(private repo: Repository) {}

  async getAllTags(): Promise<Tag[]> {
    return await this.repo.tags();
  }

  async upsertTag(name: string, color?: string): Promise<Tag> {
    return await this.repo.upsertTag(name, color);
  }

  async updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null> {
    return await this.repo.updateTag(name, updates);
  }
}