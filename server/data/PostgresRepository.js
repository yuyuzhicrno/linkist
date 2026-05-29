import pg from 'pg';

const { Pool } = pg;

export class PostgresRepository {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this._ready = false;
  }

  async initialize() {
    await this._createTables();
    this._ready = true;
  }

  async _createTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT '',
        role VARCHAR(20) DEFAULT 'member',
        xp INTEGER DEFAULT 0,
        theme VARCHAR(20) DEFAULT 'dark',
        "accentColor" VARCHAR(20) DEFAULT '#7c3aed',
        "uiSettings" JSONB DEFAULT '{"fontSize":"base","compactMode":false,"sidebarCollapsed":false}',
        friends UUID[] DEFAULT '{}',
        "friendRequests" UUID[] DEFAULT '{}',
        "isVerified" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "authorId" UUID REFERENCES users(id),
        category VARCHAR(50) DEFAULT '综合',
        tags TEXT[] DEFAULT '{}',
        flair VARCHAR(50) DEFAULT '',
        upvotes UUID[] DEFAULT '{}',
        downvotes UUID[] DEFAULT '{}',
        views INTEGER DEFAULT 0,
        comments JSONB DEFAULT '[]',
        "isPinned" BOOLEAN DEFAULT false,
        "pollId" UUID,
        "channelId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
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
        "ownerId" UUID REFERENCES users(id),
        "memberIds" UUID[] DEFAULT '{}',
        messages JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "directMessages" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants UUID[] NOT NULL,
        messages JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '',
        "authorId" UUID REFERENCES users(id),
        posts UUID[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "isPublic" BOOLEAN DEFAULT true
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

  async query(text, params) {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async queryOne(text, params) {
    const rows = await this.query(text, params);
    return rows[0] || null;
  }

  async users() {
    return this.query('SELECT * FROM users ORDER BY "createdAt" DESC');
  }

  async userById(id) {
    return this.queryOne('SELECT * FROM users WHERE id = $1', [id]);
  }

  async userByEmail(email) {
    return this.queryOne('SELECT * FROM users WHERE email = $1', [email]);
  }

  async userByUsername(username) {
    return this.queryOne('SELECT * FROM users WHERE username = $1', [username]);
  }

  async createUser(user) {
    const { id, username, email, passwordHash, avatar, bio, role, xp, theme, accentColor, uiSettings, isVerified } = user;
    return this.queryOne(
      `INSERT INTO users (id, username, email, "passwordHash", avatar, bio, role, xp, theme, "accentColor", "uiSettings", "isVerified")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, username, email, passwordHash, avatar, bio, role || 'member', xp || 0, theme || 'dark', accentColor || '#7c3aed', JSON.stringify(uiSettings || {}), isVerified !== false]
    );
  }

  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(key === 'uiSettings' ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (fields.length === 0) return this.userById(id);

    values.push(id);
    return this.queryOne(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async posts(options = {}) {
    const { page = 1, limit = 20, authorId, channelId, tag } = options;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (authorId) {
      where.push(`"authorId" = $${idx++}`);
      params.push(authorId);
    }
    if (channelId) {
      where.push(`"channelId" = $${idx++}`);
      params.push(channelId);
    }
    if (tag) {
      where.push(`$${idx++} = ANY(tags)`);
      params.push(tag);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const posts = await this.query(
      `SELECT * FROM posts ${whereClause} ORDER BY "isPinned" DESC, "createdAt" DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const countResult = await this.queryOne(
      `SELECT COUNT(*) as count FROM posts ${whereClause}`,
      params
    );

    return {
      posts,
      total: parseInt(countResult?.count || 0),
      page,
      limit
    };
  }

  async postById(id) {
    return this.queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  }

  async createPost(post) {
    const { id, title, content, authorId, category, tags, flair, isPinned, channelId } = post;
    return this.queryOne(
      `INSERT INTO posts (id, title, content, "authorId", category, tags, flair, "isPinned", "channelId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, title, content, authorId, category || '综合', tags || [], flair || '', isPinned || false, channelId]
    );
  }

  async updatePost(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(['upvotes', 'downvotes', 'comments'].includes(key) ? JSON.stringify(value) : value);
        idx++;
      }
    }

    fields.push('"updatedAt" = NOW()');
    values.push(id);

    return this.queryOne(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async deletePost(id) {
    await this.query('DELETE FROM posts WHERE id = $1', [id]);
    return true;
  }

  async channels(options = {}) {
    const { includePrivate = false, userId } = options;
    if (includePrivate && userId) {
      return this.query(
        `SELECT * FROM channels WHERE "isPublic" = true OR "ownerId" = $1 OR $1 = ANY("memberIds") ORDER BY "createdAt"`,
        [userId]
      );
    }
    return this.query('SELECT * FROM channels ORDER BY "createdAt"');
  }

  async channelById(id) {
    return this.queryOne('SELECT * FROM channels WHERE id = $1', [id]);
  }

  async channelBySlug(slug) {
    return this.queryOne('SELECT * FROM channels WHERE slug = $1', [slug]);
  }

  async createChannel(channel) {
    const { id, name, slug, description, icon, color, isPublic, ownerId, memberIds } = channel;
    return this.queryOne(
      `INSERT INTO channels (id, name, slug, description, icon, color, "isPublic", "ownerId", "memberIds")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, slug, description || '', icon || '💬', color || '#7c3aed', isPublic !== false, ownerId, memberIds || [ownerId]]
    );
  }

  async updateChannel(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(['messages', 'memberIds'].includes(key) ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (fields.length === 0) return this.channelById(id);

    values.push(id);
    return this.queryOne(
      `UPDATE channels SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async directMessages(participants) {
    return this.query(
      `SELECT * FROM "directMessages" WHERE participants @> $1 AND cardinality(participants) = $2`,
      [participants, participants.length]
    );
  }

  async directMessageById(id) {
    return this.queryOne('SELECT * FROM "directMessages" WHERE id = $1', [id]);
  }

  async createDirectMessage(dm) {
    const { id, participants, messages } = dm;
    return this.queryOne(
      `INSERT INTO "directMessages" (id, participants, messages) VALUES ($1, $2, $3) RETURNING *`,
      [id, participants, JSON.stringify(messages || [])]
    );
  }

  async updateDirectMessage(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(key === 'messages' ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (fields.length === 0) return this.directMessageById(id);

    values.push(id);
    return this.queryOne(
      `UPDATE "directMessages" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async notifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;
    let where = [`"userId" = $1`];
    let params = [userId];

    if (unreadOnly) {
      where.push('"isRead" = false');
    }

    const posts = await this.query(
      `SELECT * FROM notifications WHERE ${where.join(' AND ')} ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return posts;
  }

  async createNotification(notification) {
    const { id, userId, type, title, message, data, isRead } = notification;
    return this.queryOne(
      `INSERT INTO notifications (id, "userId", type, title, message, data, "isRead")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, type, title, message || '', JSON.stringify(data || {}), isRead || false]
    );
  }

  async markNotificationRead(id) {
    return this.queryOne(
      `UPDATE notifications SET "isRead" = true WHERE id = $1 RETURNING *`,
      [id]
    );
  }

  async tags() {
    return this.query('SELECT * FROM tags ORDER BY count DESC');
  }

  async upsertTag(name, color) {
    return this.queryOne(
      `INSERT INTO tags (name, color) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET count = tags.count + 1
       RETURNING *`,
      [name, color || '#7c3aed']
    );
  }

  async close() {
    await this.pool.end();
  }
}