import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, recordDbOp, flushDatabase, getDb } from '../data/db.js';
import { createNotification } from '../routes/notifications.js';

let userRepo = null;
let channelRepo = null;

export function setUserRepo(repo) {
  userRepo = repo;
}

export function setChannelRepo(repo) {
  channelRepo = repo;
}

export class UserService {
  async createUser({ username, email, password, bio = '' }) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      const existingEmail = await userRepo.userByEmail(email);
      if (existingEmail) {
        throw new Error('该邮箱已被注册');
      }

      const existingUsername = await userRepo.userByUsername(username);
      if (existingUsername) {
        throw new Error('该用户名已被使用');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
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
        isVerified: true
      };

      await userRepo.createUser(user);

      const general = await channelRepo?.channelBySlug('general');
      if (general) {
        const memberIds = [...(general.memberIds || []), user.id];
        await channelRepo.updateChannel(general.id, { memberIds });
      }

      return user;
    }

    const existingEmail = database.data.users.find(u => u.email === email);
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }

    const existingUsername = database.data.users.find(u => u.username === username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
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
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    database.data.users.push(user);
    recordDbOp('insert', 'users', user.id, user);

    const general = database.data.channels.find(c => c.slug === 'general');
    if (general && !general.memberIds.includes(user.id)) {
      general.memberIds.push(user.id);
      recordDbOp('update', 'channels', general.id);
    }

    await flushDatabase();

    return user;
  }

  async verifyPassword(email, password) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      const user = await userRepo.userByEmail(email);
      if (!user) return null;
      const valid = await bcrypt.compare(password, user.passwordHash);
      return valid ? user : null;
    }

    const user = database.data.users.find(u => u.email === email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async getUserById(id) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      return await userRepo.userById(id);
    }

    return database.data.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      return await userRepo.userByEmail(email);
    }

    return database.data.users.find(u => u.email === email) || null;
  }

  async updateUser(id, updates) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      if (updates.username) {
        const existing = await userRepo.userByUsername(updates.username);
        if (existing && existing.id !== id) {
          throw new Error('该用户名已被使用');
        }
      }

      const updated = await userRepo.updateUser(id, updates);
      return updated;
    }

    const userIndex = database.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('用户不存在');
    }

    const user = database.data.users[userIndex];

    if (updates.username && updates.username !== user.username) {
      const existing = database.data.users.find(u => u.username === updates.username && u.id !== id);
      if (existing) {
        throw new Error('该用户名已被使用');
      }
    }

    Object.assign(user, updates);
    recordDbOp('update', 'users', user.id);
    await flushDatabase();

    return user;
  }

  async addXp(userId, amount) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      const user = await userRepo.userById(userId);
      if (user) {
        await userRepo.updateUser(userId, { xp: (user.xp || 0) + amount });
      }
      return;
    }

    const user = database.data.users.find(u => u.id === userId);
    if (user) {
      user.xp = (user.xp || 0) + amount;
      recordDbOp('update', 'users', user.id);
      await flushDatabase();
    }
  }

  async getAllUsers(options = {}) {
    const database = getDb();

    if (database.type === 'postgres' && userRepo) {
      return await userRepo.users();
    }

    return database.data.users;
  }
}

export function calcLevel(xp) {
  if (xp < 100) return { level: 1, xp, nextLevelXp: 100 };
  if (xp < 300) return { level: 2, xp: xp - 100, nextLevelXp: 200 };
  if (xp < 600) return { level: 3, xp: xp - 300, nextLevelXp: 300 };
  if (xp < 1000) return { level: 4, xp: xp - 600, nextLevelXp: 400 };
  if (xp < 1500) return { level: 5, xp: xp - 1000, nextLevelXp: 500 };
  const level = Math.floor((Math.sqrt(2 * xp / 100) + 1));
  const needed = level > 5 ? 400 + (level - 4) * 100 : [100, 200, 300, 400, 500][Math.min(level - 1, 4)];
  return { level, xp: xp - (level > 5 ? 1000 + (level - 5) * 400 + (level - 5) * (level - 6) * 100 : 0), nextLevelXp: needed };
}

export const userService = new UserService();