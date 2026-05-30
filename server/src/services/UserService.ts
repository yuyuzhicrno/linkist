import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { User } from '../types';

export class UserService {
  constructor(private repo: Repository) {}

  async createUser({ username, email, password, bio = '' }: { username: string; email: string; password: string; bio?: string }): Promise<User> {
    const existingEmail = await this.repo.userByEmail(email);
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }

    const existingUsername = await this.repo.userByUsername(username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: Omit<User, 'createdAt'> = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      avatar: null,
      bio,
      role: 'member',
      xp: 0,
      theme: 'dark',
      accentColor: '#7c3aed',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      friends: [],
      friendRequests: [],
      isVerified: true
    };

    const created = await this.repo.createUser(user);

    const general = await this.repo.channelBySlug('general');
    if (general) {
      const memberIds = [...(general.memberIds || []), user.id];
      await this.repo.updateChannel(general.id, { memberIds });
    }

    return created;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.repo.userByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.repo.userById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.repo.userByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.repo.userByUsername(username);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (updates.username) {
      const existing = await this.repo.userByUsername(updates.username);
      if (existing && existing.id !== id) {
        throw new Error('该用户名已被使用');
      }
    }

    return await this.repo.updateUser(id, updates);
  }

  async addXp(userId: string, amount: number): Promise<void> {
    const user = await this.repo.userById(userId);
    if (user) {
      await this.repo.updateUser(userId, { xp: (user.xp || 0) + amount });
    }
  }

  async getAllUsers(options: Record<string, unknown> = {}): Promise<User[]> {
    const result = await this.repo.posts(options);
    return result.posts as unknown as User[];
  }
}

export function calcLevel(xp: number): { level: number; xp: number; nextLevelXp: number } {
  if (xp < 100) return { level: 1, xp, nextLevelXp: 100 };
  if (xp < 300) return { level: 2, xp: xp - 100, nextLevelXp: 200 };
  if (xp < 600) return { level: 3, xp: xp - 300, nextLevelXp: 300 };
  if (xp < 1000) return { level: 4, xp: xp - 600, nextLevelXp: 400 };
  if (xp < 1500) return { level: 5, xp: xp - 1000, nextLevelXp: 500 };
  const level = Math.floor((Math.sqrt(2 * xp / 100) + 1));
  const needed = level > 5 ? 400 + (level - 4) * 100 : [100, 200, 300, 400, 500][Math.min(level - 1, 4)];
  return { level, xp: xp - (level > 5 ? 1000 + (level - 5) * 400 + (level - 5) * (level - 6) * 100 : 0), nextLevelXp: needed };
}