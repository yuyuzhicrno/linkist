import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import { createRepository } from './repository.js';

const DB_TYPE = process.env.DB_TYPE || 'file';
const DB_PATH = process.env.DB_PATH || './data/db.json';
const DATABASE_URL = process.env.DATABASE_URL;
const SEED_PASSWORD = process.env.SEED_PASSWORD || '123456';

let repository = null;

export async function initDatabase() {
  if (DB_TYPE === 'postgres') {
    repository = await createRepository('postgres', DATABASE_URL);
    await repository.init();
  } else {
    const defaultData = {
      users: [],
      posts: [],
      channels: [],
      directMessages: [],
      columns: [],
      tags: [],
      polls: [],
      notifications: []
    };
    
    const adapter = new JSONFile(DB_PATH);
    const lowdb = new Low(adapter, defaultData);
    await lowdb.read();
    
    await seedData(lowdb);
    await lowdb.write();
    
    repository = await createRepository('file', null, lowdb);
  }
  
  return repository;
}

export async function seedData(lowdb) {
  if (lowdb.data.users.length === 0) {
    const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);
    
    lowdb.data.users.push({
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      avatar: null,
      bio: '系统管理员',
      xp: 9999,
      theme: 'dark',
      accentColor: '#7c3aed',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      friends: [],
      friendRequests: [],
      isVerified: true,
      createdAt: new Date().toISOString()
    });

    lowdb.data.users.push({
      id: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      passwordHash,
      role: 'member',
      avatar: null,
      bio: '演示用户',
      xp: 1000,
      theme: 'dark',
      accentColor: '#7c3aed',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      friends: ['admin-1'],
      friendRequests: [],
      isVerified: true,
      createdAt: new Date().toISOString()
    });
  }

  if (lowdb.data.channels.length === 0) {
    lowdb.data.channels.push({
      id: 'channel-general',
      name: '综合讨论',
      slug: 'general',
      description: '欢迎来到综合讨论频道',
      icon: '💬',
      color: '#7c3aed',
      isPublic: true,
      ownerId: 'admin-1',
      memberIds: ['admin-1', 'user-1'],
      messages: [],
      createdAt: new Date().toISOString()
    });

    lowdb.data.channels.push({
      id: 'channel-announcements',
      name: '公告',
      slug: 'announcements',
      description: '重要公告和更新',
      icon: '📢',
      color: '#ef4444',
      isPublic: true,
      ownerId: 'admin-1',
      memberIds: ['admin-1'],
      messages: [],
      createdAt: new Date().toISOString()
    });
  }

  if (lowdb.data.posts.length === 0) {
    lowdb.data.posts.push({
      id: 'post-1',
      title: '欢迎来到 Linkist',
      content: '这是一个现代化的社区平台，支持实时聊天、帖子讨论、私信等功能。',
      authorId: 'admin-1',
      category: '综合',
      tags: ['欢迎', '公告'],
      flair: '',
      upvotes: ['user-1'],
      downvotes: [],
      views: 42,
      comments: [],
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    lowdb.data.posts.push({
      id: 'post-2',
      title: '如何使用这个平台',
      content: '1. 注册账号\n2. 浏览帖子\n3. 加入频道\n4. 发表评论\n5. 私信交流',
      authorId: 'user-1',
      category: '帮助',
      tags: ['使用指南', '新手'],
      flair: '',
      upvotes: [],
      downvotes: [],
      views: 23,
      comments: [],
      isPinned: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    });
  }
}

export function getRepository() {
  return repository;
}

export { DB_TYPE, DB_PATH, DATABASE_URL };