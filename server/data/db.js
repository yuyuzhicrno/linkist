import bcrypt from 'bcryptjs';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_TYPE = process.env.DB_TYPE || 'file';

let autoSaveTimer = null;
let pendingSave = false;

export const LEVEL_THRESHOLDS = [0, 10, 30, 60, 100, 150, 220, 310, 420, 560, 730];
export const LEVEL_NAMES = [
  '新人', '初学者', '探索者', '贡献者', '活跃者',
  '达人', '专家', '传播者', '领袖', '先驱', '传奇'
];
export const LEVEL_COLORS = [
  '#94a3b8', '#64748b', '#3b82f6', '#10b981', '#f59e0b',
  '#f97316', '#ef4444', '#a855f7', '#ec4899', '#7c3aed', '#fbbf24'
];

export function calcLevel(xp) {
  let lv = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { lv = i; break; }
  }
  const nextXp = LEVEL_THRESHOLDS[lv + 1] || null;
  return { level: lv, name: LEVEL_NAMES[lv], color: LEVEL_COLORS[lv], xp, nextXp };
}

export const CHANNEL_CREATE_LEVEL = 3;

let dbInstance = null;

class PostgresDB {
  constructor() {
    this.pool = null;
    this._ready = false;
    this._data = {
      users: [],
      posts: [],
      channels: [],
      columns: [],
      directMessages: [],
      tags: [],
      polls: [],
      notifications: []
    };
  }

  get data() {
    return this._data;
  }

  get ready() {
    return this._ready;
  }

  async init() {
    const { default: pg } = await import('pg');
    const { Pool } = pg;

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await this._createTables();
    await this._loadData();
    await this._seedData();
    this._startSync();
    this._ready = true;
    console.log('PostgreSQL database initialized');
  }

  async _createTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT '',
        role VARCHAR(20) DEFAULT 'member',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        theme VARCHAR(20) DEFAULT 'dark',
        "accentColor" VARCHAR(20) DEFAULT '#7c3aed',
        "uiSettings" JSONB DEFAULT '{"fontSize":"base","compactMode":false,"sidebarCollapsed":false}',
        xp INTEGER DEFAULT 0,
        friends UUID[] DEFAULT '{}',
        "friendRequests" UUID[] DEFAULT '{}'
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        icon VARCHAR(10) DEFAULT '💬',
        color VARCHAR(20) DEFAULT '#7c3aed',
        "isPublic" BOOLEAN DEFAULT true,
        "memberIds" UUID[] DEFAULT '{}',
        "ownerId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        messages JSONB DEFAULT '[]'
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        "authorId" UUID REFERENCES users(id),
        category VARCHAR(50) DEFAULT '综合',
        tags TEXT[] DEFAULT '{}',
        flair VARCHAR(50) DEFAULT '',
        upvotes UUID[] DEFAULT '{}',
        downvotes UUID[] DEFAULT '{}',
        views INTEGER DEFAULT 0,
        comments JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP,
        "isPinned" BOOLEAN DEFAULT false,
        "pollId" UUID
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        "authorId" UUID REFERENCES users(id),
        description TEXT DEFAULT '',
        color VARCHAR(20) DEFAULT '#7c3aed',
        icon VARCHAR(10) DEFAULT '📁',
        articles JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "isPublic" BOOLEAN DEFAULT true
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "directMessages" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants UUID[] NOT NULL,
        messages JSONB DEFAULT '[]'
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        name VARCHAR(100) PRIMARY KEY,
        count INTEGER DEFAULT 0,
        color VARCHAR(20) DEFAULT '#7c3aed'
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question TEXT NOT NULL,
        options JSONB DEFAULT '[]',
        "authorId" UUID REFERENCES users(id),
        "postId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        expiresAt TIMESTAMP,
        "allowMultiple" BOOLEAN DEFAULT false,
        "totalVotes" INTEGER DEFAULT 0
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID REFERENCES users(id) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        data JSONB DEFAULT '{}',
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_authorId ON posts("authorId");
      CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
      CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
      CREATE INDEX IF NOT EXISTS idx_columns_authorId ON columns("authorId");
      CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
    `);
  }

  async _loadData() {
    const [users, posts, channels, columns, dms, tags, polls, notifications] = await Promise.all([
      this.pool.query('SELECT * FROM users'),
      this.pool.query('SELECT * FROM posts ORDER BY "createdAt" DESC'),
      this.pool.query('SELECT * FROM channels ORDER BY "createdAt"'),
      this.pool.query('SELECT * FROM columns ORDER BY "createdAt"'),
      this.pool.query('SELECT * FROM "directMessages"'),
      this.pool.query('SELECT * FROM tags ORDER BY count DESC'),
      this.pool.query('SELECT * FROM polls ORDER BY "createdAt" DESC'),
      this.pool.query('SELECT * FROM notifications ORDER BY "createdAt" DESC')
    ]);

    this._data = {
      users: users.rows.map(u => ({
        ...u,
        friends: u.friends || [],
        friendRequests: u.friendRequests || []
      })),
      posts: posts.rows,
      channels: channels.rows.map(c => ({
        ...c,
        memberIds: c.memberIds || [],
        messages: c.messages || []
      })),
      columns: columns.rows,
      directMessages: dms.rows.map(dm => ({
        ...dm,
        participants: dm.participants || [],
        messages: dm.messages || []
      })),
      tags: tags.rows,
      polls: polls.rows.map(p => ({
        ...p,
        options: typeof p.options === 'string' ? JSON.parse(p.options) : (p.options || [])
      })),
      notifications: notifications.rows
    };
  }

  async _seedData() {
    const userCheck = await this.pool.query('SELECT id FROM users WHERE email = $1', ['admin@example.com']);
    if (userCheck.rows.length === 0) {
      const passwordHash = bcrypt.hashSync('123456', 10);
      await this.pool.query(`
        INSERT INTO users (id, username, email, "passwordHash", bio, role, xp, theme, "accentColor", "isVerified")
        VALUES
          ('u1', 'admin', 'admin@example.com', $1, '系统管理员', 'admin', 1000, 'dark', '#7c3aed', true),
          ('u2', 'testuser', 'test@example.com', $1, '测试用户', 'member', 50, 'dark', '#3b82f6', true),
          ('u3', 'developer', 'dev@example.com', $1, '开发者', 'member', 200, 'light', '#10b981', true)
      `, [passwordHash]);

      await this.pool.query(`
        INSERT INTO channels (id, name, slug, description, icon, color, "isPublic", "memberIds")
        VALUES ('c1', '通用讨论', 'general', '什么都可以聊！', '💬', '#7c3aed', true, ARRAY['u1', 'u2', 'u3']::uuid[])
        ON CONFLICT (slug) DO NOTHING
      `);
      console.log('PostgreSQL seed data created');
      await this._loadData();
    }
  }

  _startSync() {
    setInterval(async () => {
      if (pendingSave) {
        await this._syncToDb();
        pendingSave = false;
      }
    }, 5000);
  }

  async _syncToDb() {
    try {
      for (const user of this._data.users) {
        await this.pool.query(`
          UPDATE users SET
            username = $2, email = $3, avatar = $4, bio = $5, role = $6,
            theme = $7, "accentColor" = $8, "uiSettings" = $9, xp = $10,
            friends = $11, "friendRequests" = $12
          WHERE id = $1
        `, [user.id, user.username, user.email, user.avatar, user.bio, user.role,
            user.theme, user.accentColor, JSON.stringify(user.uiSettings || {}), user.xp || 0,
            user.friends || [], user.friendRequests || []]);
      }

      for (const channel of this._data.channels) {
        await this.pool.query(`
          UPDATE channels SET
            name = $2, description = $3, icon = $4, color = $5, "isPublic" = $6,
            "memberIds" = $7, messages = $8
          WHERE id = $1
        `, [channel.id, channel.name, channel.description, channel.icon, channel.color,
            channel.isPublic, channel.memberIds || [], JSON.stringify(channel.messages || [])]);
      }

      for (const post of this._data.posts) {
        await this.pool.query(`
          UPDATE posts SET
            title = $2, content = $3, category = $4, tags = $5, flair = $6,
            upvotes = $7, downvotes = $8, views = $9, comments = $10,
            "updatedAt" = $11, "isPinned" = $12, "pollId" = $13
          WHERE id = $1
        `, [post.id, post.title, post.content, post.category, post.tags || [],
            post.flair || '', post.upvotes || [], post.downvotes || [], post.views || 0,
            JSON.stringify(post.comments || []), post.updatedAt, post.isPinned || false, post.pollId]);
      }
    } catch (err) {
      console.error('Sync error:', err.message);
    }
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async close() {
    if (this.pool) {
      await this._syncToDb();
      await this.pool.end();
    }
  }
}

class FileDB {
  constructor() {
    this._lowdb = null;
    this._ready = false;
  }

  get data() {
    return this._lowdb?.data || {
      users: [],
      posts: [],
      channels: [],
      columns: [],
      directMessages: [],
      tags: [],
      polls: [],
      notifications: []
    };
  }

  get ready() {
    return this._ready;
  }

  init() {
    const dbPath = path.join(__dirname, '../data/db.json');
    const adapter = new JSONFileSync(dbPath);

    const defaultData = {
      users: [],
      directMessages: [],
      tags: [],
      polls: [],
      channels: [{
        id: 'c1',
        name: '通用讨论',
        slug: 'general',
        description: '什么都可以聊！',
        icon: '💬',
        color: '#7c3aed',
        isPublic: true,
        memberIds: [],
        ownerId: null,
        createdAt: new Date().toISOString(),
        messages: []
      }],
      posts: [],
      columns: [],
      notifications: []
    };

    this._lowdb = new LowSync(adapter, defaultData);
    this._lowdb.read();

    if (!this._lowdb.data.notifications) {
      this._lowdb.data.notifications = [];
    }

    if (this._lowdb.data.users.length === 0) {
      const passwordHash = bcrypt.hashSync('123456', 10);
      this._lowdb.data.users = [
        {
          id: 'u1',
          username: 'admin',
          email: 'admin@example.com',
          passwordHash,
          avatar: null,
          bio: '系统管理员',
          role: 'admin',
          createdAt: new Date().toISOString(),
          theme: 'dark',
          accentColor: '#7c3aed',
          uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
          xp: 1000,
          friends: [],
          friendRequests: []
        },
        {
          id: 'u2',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash,
          avatar: null,
          bio: '测试用户',
          role: 'member',
          createdAt: new Date().toISOString(),
          theme: 'dark',
          accentColor: '#3b82f6',
          uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
          xp: 50,
          friends: [],
          friendRequests: []
        },
        {
          id: 'u3',
          username: 'developer',
          email: 'dev@example.com',
          passwordHash,
          avatar: null,
          bio: '开发者',
          role: 'member',
          createdAt: new Date().toISOString(),
          theme: 'light',
          accentColor: '#10b981',
          uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
          xp: 200,
          friends: [],
          friendRequests: []
        }
      ];
      this._lowdb.data.channels[0].memberIds = ['u1', 'u2', 'u3'];
      this._lowdb.write();
    }
    this._ready = true;
  }

  write() {
    if (this._lowdb) {
      this._lowdb.write();
    }
  }

  close() {
  }
}

export function saveDatabase() {
  if (DB_TYPE !== 'file' || !dbInstance) return;

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    if (dbInstance?.write) {
      dbInstance.write();
    }
    pendingSave = false;
  }, 100);

  pendingSave = true;
}

export function flushDatabase() {
  if (DB_TYPE === 'file') {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (pendingSave && dbInstance?.write) {
      dbInstance.write();
      pendingSave = false;
    }
  } else if (DB_TYPE === 'postgres' && dbInstance?.pool) {
    dbInstance._syncToDb && dbInstance._syncToDb();
  }
}

export async function initDatabase() {
  if (DB_TYPE === 'postgres') {
    dbInstance = new PostgresDB();
    await dbInstance.init();
  } else {
    dbInstance = new FileDB();
    dbInstance.init();
  }
  return dbInstance;
}

export function startAutoSave() {
  if (DB_TYPE !== 'file' || !dbInstance) return;
  setInterval(() => {
    if (dbInstance?.write) {
      dbInstance.write();
    }
  }, 5000);
}

export const db = {
  get data() {
    return dbInstance?.data || { users: [], posts: [], channels: [], columns: [], directMessages: [], tags: [], polls: [] };
  },
  get ready() {
    return dbInstance?.ready || false;
  },
  get pool() {
    return dbInstance?.pool || null;
  }
};

export function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function syncTagCount(tagName) {
  if (!tagName) return;
  if (DB_TYPE === 'file' && dbInstance?._lowdb) {
    const tag = dbInstance._lowdb.data.tags.find(t => t.name === tagName);
    if (tag) {
      tag.count = dbInstance._lowdb.data.posts.filter(p => p.tags.includes(tagName)).length;
    }
  }
}

export function addXp(userId, amount) {
  const user = db.data.users.find(u => u.id === userId);
  if (user) {
    user.xp = (user.xp || 0) + amount;
    saveDatabase();
  }
}