export class TagService {
  constructor(repo) {
    this.repo = repo;
  }

  async getAllTags() {
    return await this.repo.tags();
  }

  async upsertTag(name, color) {
    return await this.repo.upsertTag(name, color);
  }

  async updateTag(name, updates) {
    return await this.repo.updateTag(name, updates);
  }
}