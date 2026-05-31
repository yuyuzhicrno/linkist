import pg from 'pg';

const { Pool } = pg;

export class Repository {
  constructor() {
    this.type = 'base';
  }

  async init() {}
  async close() {}
}

export class FileRepository extends Repository {
  constructor(dbInstance) {
    super();
    this.type = 'file';
    this.db = dbInstance;
  }

  async init() {
    this.data = this.db.data;
    // 初始化独立集合
    if (!this.data.post_comments) this.data.post_comments = [];
    if (!this.data.comment_replies) this.data.comment_replies = [];
    if (!this.data.channel_messages) this.data.channel_messages = [];
    if (!this.data.dm_messages) this.data.dm_messages = [];
  }

  async users() {
    return this.data.users || [];
  }

  async userById(id) {
    return this.data.users?.find(u => u.id === id) || null;
  }

  async userByEmail(email) {
    return this.data.users?.find(u => u.email === email) || null;
  }

  async userByUsername(username) {
    return this.data.users?.find(u => u.username === username) || null;
  }

  async createUser(user) {
    if (!this.data.users) this.data.users = [];
    user.createdAt = new Date().toISOString();
    user.friends = user.friends || [];
    user.friendRequests = user.friendRequests || [];
    user.xp = user.xp || 0;
    this.data.users.push(user);
    await this.db.write();
    return user;
  }

  async updateUser(id, updates) {
    const idx = this.data.users?.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.users[idx], updates);
    await this.db.write();
    return this.data.users[idx];
  }

  async posts(options = {}) {
    const { page = 1, limit = 20, authorId, channelId, tag } = options;
    let posts = [...(this.data.posts || [])];

    if (authorId) posts = posts.filter(p => p.authorId === authorId);
    if (channelId) posts = posts.filter(p => p.channelId === channelId);
    if (tag) posts = posts.filter(p => p.tags?.includes(tag));

    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return {
      posts: paginatedPosts,
      total: posts.length,
      page,
      limit
    };
  }

  async postById(id) {
    return this.data.posts?.find(p => p.id === id) || null;
  }

  async createPost(post) {
    if (!this.data.posts) this.data.posts = [];
    post.createdAt = new Date().toISOString();
    post.updatedAt = new Date().toISOString();
    post.upvotes = [];
    post.downvotes = [];
    post.views = 0;
    post.commentCount = 0;
    post.isPinned = false;
    this.data.posts.push(post);
    await this.db.write();
    return post;
  }

  async updatePost(id, updates) {
    const idx = this.data.posts?.findIndex(p => p.id === id);
    if (idx === -1) return null;
    updates.updatedAt = new Date().toISOString();
    Object.assign(this.data.posts[idx], updates);
    await this.db.write();
    return this.data.posts[idx];
  }

  async deletePost(id) {
    const idx = this.data.posts?.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.posts.splice(idx, 1);
    // 删除相关评论和回复
    const deletedCommentIds = (this.data.post_comments || []).filter(c => c.postId === id).map(c => c.id);
    this.data.post_comments = (this.data.post_comments || []).filter(c => c.postId !== id);
    this.data.comment_replies = (this.data.comment_replies || []).filter(r => !deletedCommentIds.includes(r.commentId));
    await this.db.write();
    return true;
  }

  async channels(options = {}) {
    const { includePrivate = false, userId } = options;
    let channels = [...(this.data.channels || [])];

    if (!includePrivate && userId) {
      channels = channels.filter(c => 
        c.isPublic || 
        c.memberIds?.includes(userId) || 
        c.ownerId === userId
      );
    }

    return channels;
  }

  async channelById(id) {
    return this.data.channels?.find(c => c.id === id) || null;
  }

  async channelBySlug(slug) {
    return this.data.channels?.find(c => c.slug === slug) || null;
  }

  async createChannel(channel) {
    if (!this.data.channels) this.data.channels = [];
    channel.createdAt = new Date().toISOString();
    channel.memberIds = channel.memberIds || [];
    channel.messageCount = 0;
    this.data.channels.push(channel);
    await this.db.write();
    return channel;
  }

  async updateChannel(id, updates) {
    const idx = this.data.channels?.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.channels[idx], updates);
    await this.db.write();
    return this.data.channels[idx];
  }

  async deleteChannel(id) {
    const idx = this.data.channels?.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.channels.splice(idx, 1);
    // 删除相关消息
    this.data.channel_messages = (this.data.channel_messages || []).filter(m => m.channelId !== id);
    await this.db.write();
    return true;
  }

  async directMessages(participants) {
    return (this.data.directMessages || []).filter(dm => 
      dm.participants?.length === participants.length &&
      participants.every(p => dm.participants?.includes(p))
    );
  }

  async directMessageById(id) {
    return this.data.directMessages?.find(dm => dm.id === id) || null;
  }

  async createDirectMessage(dm) {
    if (!this.data.directMessages) this.data.directMessages = [];
    dm.createdAt = new Date().toISOString();
    dm.messageCount = 0;
    this.data.directMessages.push(dm);
    await this.db.write();
    return dm;
  }

  async updateDirectMessage(id, updates) {
    const idx = this.data.directMessages?.findIndex(dm => dm.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.directMessages[idx], updates);
    await this.db.write();
    return this.data.directMessages[idx];
  }

  async deleteDirectMessage(id) {
    const idx = this.data.directMessages?.findIndex(dm => dm.id === id);
    if (idx === -1) return false;
    this.data.directMessages.splice(idx, 1);
    // 删除相关消息
    this.data.dm_messages = (this.data.dm_messages || []).filter(m => m.dmId !== id);
    await this.db.write();
    return true;
  }

  async notifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    let notifications = (this.data.notifications || []).filter(n => n.userId === userId);
    
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (page - 1) * limit;
    return notifications.slice(start, start + limit);
  }

  async createNotification(notification) {
    if (!this.data.notifications) this.data.notifications = [];
    notification.createdAt = new Date().toISOString();
    notification.isRead = false;
    this.data.notifications.push(notification);
    await this.db.write();
    return notification;
  }

  async markNotificationRead(id) {
    const idx = this.data.notifications?.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.data.notifications[idx].isRead = true;
    await this.db.write();
    return this.data.notifications[idx];
  }

  async markAllNotificationsRead(userId) {
    (this.data.notifications || []).forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
    await this.db.write();
  }

  async tags() {
    return this.data.tags || [];
  }

  async upsertTag(name, color) {
    if (!this.data.tags) this.data.tags = [];
    const existing = this.data.tags.find(t => t.name === name);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      if (color) existing.color = color;
    } else {
      this.data.tags.push({ name, count: 1, color: color || '#7c3aed' });
    }
    await this.db.write();
    return this.data.tags.find(t => t.name === name);
  }

  async updateTag(name, updates) {
    const idx = this.data.tags?.findIndex(t => t.name === name);
    if (idx === -1) return null;
    Object.assign(this.data.tags[idx], updates);
    await this.db.write();
    return this.data.tags[idx];
  }

  async polls() {
    return this.data.polls || [];
  }

  async pollById(id) {
    return this.data.polls?.find(p => p.id === id) || null;
  }

  async createPoll(poll) {
    if (!this.data.polls) this.data.polls = [];
    poll.createdAt = new Date().toISOString();
    poll.totalVotes = 0;
    this.data.polls.push(poll);
    await this.db.write();
    return poll;
  }

  async updatePoll(id, updates) {
    const idx = this.data.polls?.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.polls[idx], updates);
    await this.db.write();
    return this.data.polls[idx];
  }

  async deletePoll(id) {
    const idx = this.data.polls?.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.polls.splice(idx, 1);
    await this.db.write();
    return true;
  }

  async columns() {
    const columns = this.data.columns || [];
    return columns.map(col => ({
      ...col,
      articleCount: (this.data.column_articles || []).filter(a => a.columnId === col.id).length
    }));
  }

  async columnById(id) {
    return this.data.columns?.find(c => c.id === id) || null;
  }

  async columnBySlug(slug) {
    return this.data.columns?.find(c => c.slug === slug) || null;
  }

  async createColumn(column) {
    if (!this.data.columns) this.data.columns = [];
    column.createdAt = new Date().toISOString();
    column.followers = [];
    this.data.columns.push(column);
    await this.db.write();
    return column;
  }

  async columnPosts(columnId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const postIds = (this.data.column_posts || [])
      .filter(cp => cp.columnId === columnId)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .slice(offset, offset + limit)
      .map(cp => cp.postId);

    return postIds.map(id => this.data.posts?.find(p => p.id === id)).filter(Boolean);
  }

  async addColumnArticle(columnId, article) {
    if (!this.data.column_articles) this.data.column_articles = [];
    const column = this.data.columns?.find(c => c.id === columnId);
    if (!column) return null;

    const newArticle = {
      id: article.id,
      columnId,
      title: article.title,
      summary: article.summary || '',
      content: article.content || '',
      tags: article.tags || [],
      likes: [],
      views: 0,
      readTime: article.readTime || 1,
      createdAt: new Date().toISOString()
    };

    this.data.column_articles.push(newArticle);

    if (article.postId) {
      if (!this.data.column_posts) this.data.column_posts = [];
      this.data.column_posts.push({
        columnId,
        postId: article.postId,
        addedAt: new Date().toISOString()
      });
    }

    await this.db.write();
    return newArticle;
  }

  async getColumnArticle(columnId, articleId) {
    const article = this.data.column_articles?.find(
      a => a.id === articleId && a.columnId === columnId
    );
    if (!article) return null;

    article.views = (article.views || 0) + 1;
    await this.db.write();
    return article;
  }

  async toggleColumnArticleLike(columnId, articleId, userId) {
    const article = this.data.column_articles?.find(
      a => a.id === articleId && a.columnId === columnId
    );
    if (!article) return null;

    article.likes = article.likes || [];
    const likeIdx = article.likes.indexOf(userId);
    if (likeIdx === -1) {
      article.likes.push(userId);
    } else {
      article.likes.splice(likeIdx, 1);
    }

    await this.db.write();
    return { likes: article.likes.length, liked: likeIdx === -1 };
  }

  async toggleColumnFollow(columnId, userId) {
    const column = this.data.columns?.find(c => c.id === columnId);
    if (!column) return null;

    column.followers = column.followers || [];
    const idx = column.followers.indexOf(userId);
    if (idx === -1) {
      column.followers.push(userId);
    } else {
      column.followers.splice(idx, 1);
    }

    await this.db.write();
    return { followed: idx === -1, followers: column.followers.length };
  }

  async commentById(commentId) {
    return this.data.post_comments?.find(c => c.id === commentId) || null;
  }

  async postComments(postId) {
    return (this.data.post_comments || []).filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async createComment(comment) {
    const { id, postId, authorId, content } = comment;
    const post = this.data.posts?.find(p => p.id === postId);
    if (!post) return null;
    
    if (!this.data.post_comments) this.data.post_comments = [];
    const newComment = {
      id,
      postId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      upvotes: [],
      replyCount: 0
    };
    this.data.post_comments.push(newComment);
    post.commentCount = (post.commentCount || 0) + 1;
    await this.db.write();
    return newComment;
  }

  async commentUpvote(commentId, userId) {
    const comment = this.data.post_comments?.find(c => c.id === commentId);
    if (!comment) return null;
    comment.upvotes = comment.upvotes || [];
    if (comment.upvotes.includes(userId)) {
      comment.upvotes = comment.upvotes.filter(id => id !== userId);
    } else {
      comment.upvotes.push(userId);
    }
    await this.db.write();
    return comment;
  }

  async commentReplies(commentId) {
    return (this.data.comment_replies || []).filter(r => r.commentId === commentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async createReply(reply) {
    const { id, commentId, authorId, content } = reply;
    const comment = this.data.post_comments?.find(c => c.id === commentId);
    if (!comment) return null;
    
    if (!this.data.comment_replies) this.data.comment_replies = [];
    const newReply = {
      id,
      commentId,
      authorId,
      content,
      createdAt: new Date().toISOString()
    };
    this.data.comment_replies.push(newReply);
    comment.replyCount = (comment.replyCount || 0) + 1;
    await this.db.write();
    return newReply;
  }

  async updateComment(id, updates) {
    const idx = this.data.post_comments?.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (updates.content !== undefined) this.data.post_comments[idx].content = updates.content;
    if (updates.upvotes !== undefined) this.data.post_comments[idx].upvotes = updates.upvotes;
    await this.db.write();
    return this.data.post_comments[idx];
  }

  async deleteComment(id) {
    const idx = this.data.post_comments?.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const comment = this.data.post_comments[idx];
    const post = this.data.posts?.find(p => p.id === comment.postId);
    if (post) post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    this.data.post_comments.splice(idx, 1);
    this.data.comment_replies = (this.data.comment_replies || []).filter(r => r.commentId !== id);
    await this.db.write();
    return true;
  }

  async channelMessages(channelId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const messages = (this.data.channel_messages || []).filter(m => m.channelId === channelId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages.slice(offset, offset + limit);
  }

  async createChannelMessage(msg) {
    const { id, channelId, authorId, content } = msg;
    const channel = this.data.channels?.find(c => c.id === channelId);
    if (!channel) return null;
    
    if (!this.data.channel_messages) this.data.channel_messages = [];
    const newMsg = {
      id,
      channelId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    };
    this.data.channel_messages.push(newMsg);
    channel.messageCount = (channel.messageCount || 0) + 1;
    await this.db.write();
    return newMsg;
  }

  async dmMessages(dmId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const messages = (this.data.dm_messages || []).filter(m => m.dmId === dmId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages.slice(offset, offset + limit);
  }

  async createDmMessage(msg) {
    const { id, dmId, authorId, content } = msg;
    const dm = this.data.directMessages?.find(d => d.id === dmId);
    if (!dm) return null;
    
    if (!this.data.dm_messages) this.data.dm_messages = [];
    const newMsg = {
      id,
      dmId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    };
    this.data.dm_messages.push(newMsg);
    dm.messageCount = (dm.messageCount || 0) + 1;
    await this.db.write();
    return newMsg;
  }

  async messageReactions(messageId, messageType) {
    const reactions = {};
    const allReactions = this.data.message_reactions || [];
    const messageReactions = allReactions.filter(r => r.messageId === messageId && r.messageType === messageType);
    
    for (const reaction of messageReactions) {
      if (!reactions[reaction.emoji]) {
        reactions[reaction.emoji] = [];
      }
      reactions[reaction.emoji].push(reaction.userId);
    }
    
    return Object.entries(reactions).map(([emoji, userIds]) => ({ emoji, userIds }));
  }

  async toggleReaction(messageId, messageType, emoji, userId) {
    if (!this.data.message_reactions) this.data.message_reactions = [];
    
    const existingIdx = this.data.message_reactions.findIndex(
      r => r.messageId === messageId && r.messageType === messageType && r.emoji === emoji && r.userId === userId
    );
    
    if (existingIdx !== -1) {
      this.data.message_reactions.splice(existingIdx, 1);
    } else {
      this.data.message_reactions.push({
        id: crypto.randomUUID(),
        messageId,
        messageType,
        emoji,
        userId,
        createdAt: new Date().toISOString()
      });
    }
    
    await this.db.write();
    return this.messageReactions(messageId, messageType);
  }
}

export class PostgresRepository extends Repository {
  constructor(connectionString) {
    super();
    this.type = 'postgres';
    this.pool = new Pool({ connectionString });
  }

  async init() {
    await this._createTables();
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
        "commentCount" INTEGER DEFAULT 0,
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
        "messageCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "directMessages" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants UUID[] NOT NULL,
        "messageCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        "authorId" UUID REFERENCES users(id),
        "coverColor" VARCHAR(20) DEFAULT '#7c3aed',
        followers UUID[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "isPublic" BOOLEAN DEFAULT true
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS column_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "columnId" UUID REFERENCES columns(id) ON DELETE CASCADE,
        "postId" UUID,
        title TEXT NOT NULL,
        summary TEXT DEFAULT '',
        content TEXT DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        likes UUID[] DEFAULT '{}',
        views INTEGER DEFAULT 0,
        "readTime" INTEGER DEFAULT 1,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("columnId", "postId")
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS column_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "columnId" UUID REFERENCES columns(id) ON DELETE CASCADE,
        "postId" UUID REFERENCES posts(id) ON DELETE CASCADE,
        "addedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("columnId", "postId")
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
      CREATE TABLE IF NOT EXISTS post_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "postId" UUID REFERENCES posts(id) ON DELETE CASCADE,
        "authorId" UUID REFERENCES users(id),
        content TEXT NOT NULL,
        upvotes UUID[] DEFAULT '{}',
        "replyCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS comment_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "commentId" UUID REFERENCES post_comments(id) ON DELETE CASCADE,
        "authorId" UUID REFERENCES users(id),
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "channelId" UUID REFERENCES channels(id) ON DELETE CASCADE,
        "authorId" UUID REFERENCES users(id),
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "dmId" UUID REFERENCES "directMessages"(id) ON DELETE CASCADE,
        "authorId" UUID REFERENCES users(id),
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "messageId" UUID NOT NULL,
        "messageType" VARCHAR(20) NOT NULL,
        emoji VARCHAR(100) NOT NULL,
        "userId" UUID REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("messageId", "messageType", emoji, "userId")
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_authorId ON posts("authorId");
      CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
      CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
      CREATE INDEX IF NOT EXISTS idx_columns_authorId ON columns("authorId");
      CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
      CREATE INDEX IF NOT EXISTS idx_post_comments_postId ON post_comments("postId");
      CREATE INDEX IF NOT EXISTS idx_comment_replies_commentId ON comment_replies("commentId");
      CREATE INDEX IF NOT EXISTS idx_channel_messages_channelId ON channel_messages("channelId");
      CREATE INDEX IF NOT EXISTS idx_dm_messages_dmId ON dm_messages("dmId");
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions("messageId", "messageType");
      CREATE INDEX IF NOT EXISTS idx_column_articles_columnId ON column_articles("columnId");
      CREATE INDEX IF NOT EXISTS idx_column_posts_columnId ON column_posts("columnId");
      CREATE INDEX IF NOT EXISTS idx_column_posts_postId ON column_posts("postId");
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
        values.push(['upvotes', 'downvotes'].includes(key) ? JSON.stringify(value) : value);
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
        values.push(['memberIds'].includes(key) ? JSON.stringify(value) : value);
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
    const { id, participants } = dm;
    return this.queryOne(
      `INSERT INTO "directMessages" (id, participants) VALUES ($1, $2) RETURNING *`,
      [id, participants]
    );
  }

  async updateDirectMessage(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
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

    return this.query(
      `SELECT * FROM notifications WHERE ${where.join(' AND ')} ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
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

  async markAllNotificationsRead(userId) {
    await this.query(`UPDATE notifications SET "isRead" = true WHERE "userId" = $1`, [userId]);
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

  async updateTag(name, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return this.queryOne('SELECT * FROM tags WHERE name = $1', [name]);

    values.push(name);
    return this.queryOne(
      `UPDATE tags SET ${fields.join(', ')} WHERE name = $${idx} RETURNING *`,
      values
    );
  }

  async polls() {
    return this.query('SELECT * FROM polls ORDER BY "createdAt" DESC');
  }

  async pollById(id) {
    return this.queryOne('SELECT * FROM polls WHERE id = $1', [id]);
  }

  async createPoll(poll) {
    const { id, question, options, authorId, postId, expiresAt, allowMultiple } = poll;
    return this.queryOne(
      `INSERT INTO polls (id, question, options, "authorId", "postId", expiresAt, "allowMultiple")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, question, JSON.stringify(options || []), authorId, postId, expiresAt, allowMultiple || false]
    );
  }

  async updatePoll(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        values.push(key === 'options' ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (fields.length === 0) return this.pollById(id);

    values.push(id);
    return this.queryOne(
      `UPDATE polls SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async commentById(id) {
    return this.queryOne('SELECT * FROM post_comments WHERE id = $1', [id]);
  }

  async updateComment(id, updates) {
    const setClauses = [];
    const values = [];
    let paramIdx = 1;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`"${key}" = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }
    if (setClauses.length === 0) return this.commentById(id);
    setClauses.push(`"updatedAt" = NOW()`);
    values.push(id);
    return this.queryOne(
      `UPDATE post_comments SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );
  }

  async deleteComment(id) {
    const comment = await this.commentById(id);
    if (!comment) return false;
    await this.pool.query('DELETE FROM comment_replies WHERE "commentId" = $1', [id]);
    await this.pool.query('DELETE FROM post_comments WHERE id = $1', [id]);
    await this.pool.query(
      'UPDATE posts SET "commentCount" = GREATEST(0, COALESCE("commentCount", 0) - 1) WHERE id = $1',
      [comment.postId]
    );
    return true;
  }

  async postComments(postId) {
    return this.query(
      'SELECT * FROM post_comments WHERE "postId" = $1 ORDER BY "createdAt" ASC',
      [postId]
    );
  }

  async createComment(comment) {
    const { id, postId, authorId, content } = comment;
    await this.query(
      `INSERT INTO post_comments (id, "postId", "authorId", content) VALUES ($1, $2, $3, $4)`,
      [id, postId, authorId, content]
    );
    await this.query(
      `UPDATE posts SET "commentCount" = "commentCount" + 1 WHERE id = $1`,
      [postId]
    );
    return this.queryOne('SELECT * FROM post_comments WHERE id = $1', [id]);
  }

  async commentUpvote(commentId, userId) {
    const comment = await this.queryOne('SELECT * FROM post_comments WHERE id = $1', [commentId]);
    if (!comment) return null;
    const upvotes = comment.upvotes || [];
    if (upvotes.includes(userId)) {
      await this.query(
        `UPDATE post_comments SET upvotes = array_remove(upvotes, $1) WHERE id = $2`,
        [userId, commentId]
      );
    } else {
      await this.query(
        `UPDATE post_comments SET upvotes = array_append(upvotes, $1) WHERE id = $2`,
        [userId, commentId]
      );
    }
    return this.queryOne('SELECT * FROM post_comments WHERE id = $1', [commentId]);
  }

  async commentReplies(commentId) {
    return this.query(
      'SELECT * FROM comment_replies WHERE "commentId" = $1 ORDER BY "createdAt" ASC',
      [commentId]
    );
  }

  async createReply(reply) {
    const { id, commentId, authorId, content } = reply;
    await this.query(
      `INSERT INTO comment_replies (id, "commentId", "authorId", content) VALUES ($1, $2, $3, $4)`,
      [id, commentId, authorId, content]
    );
    await this.query(
      `UPDATE post_comments SET "replyCount" = "replyCount" + 1 WHERE id = $1`,
      [commentId]
    );
    return this.queryOne('SELECT * FROM comment_replies WHERE id = $1', [id]);
  }

  async channelMessages(channelId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    return this.query(
      `SELECT * FROM channel_messages WHERE "channelId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
  }

  async createChannelMessage(msg) {
    const { id, channelId, authorId, content } = msg;
    await this.query(
      `INSERT INTO channel_messages (id, "channelId", "authorId", content) VALUES ($1, $2, $3, $4)`,
      [id, channelId, authorId, content]
    );
    await this.query(
      `UPDATE channels SET "messageCount" = "messageCount" + 1 WHERE id = $1`,
      [channelId]
    );
    return this.queryOne('SELECT * FROM channel_messages WHERE id = $1', [id]);
  }

  async dmMessages(dmId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    return this.query(
      `SELECT * FROM dm_messages WHERE "dmId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      [dmId, limit, offset]
    );
  }

  async createDmMessage(msg) {
    const { id, dmId, authorId, content } = msg;
    await this.query(
      `INSERT INTO dm_messages (id, "dmId", "authorId", content) VALUES ($1, $2, $3, $4)`,
      [id, dmId, authorId, content]
    );
    await this.query(
      `UPDATE "directMessages" SET "messageCount" = "messageCount" + 1 WHERE id = $1`,
      [dmId]
    );
    return this.queryOne('SELECT * FROM dm_messages WHERE id = $1', [id]);
  }

  async messageReactions(messageId, messageType) {
    return this.query(
      `SELECT emoji, array_agg("userId") as userIds FROM message_reactions 
       WHERE "messageId" = $1 AND "messageType" = $2 GROUP BY emoji`,
      [messageId, messageType]
    );
  }

  async toggleReaction(messageId, messageType, emoji, userId) {
    const existing = await this.queryOne(
      `SELECT * FROM message_reactions WHERE "messageId" = $1 AND "messageType" = $2 AND emoji = $3 AND "userId" = $4`,
      [messageId, messageType, emoji, userId]
    );
    if (existing) {
      await this.query(
        `DELETE FROM message_reactions WHERE id = $1`,
        [existing.id]
      );
    } else {
      await this.query(
        `INSERT INTO message_reactions (id, "messageId", "messageType", emoji, "userId") VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), messageId, messageType, emoji, userId]
      );
    }
    return this.messageReactions(messageId, messageType);
  }

  async deleteChannel(id) {
    const channel = await this.channelById(id);
    if (!channel) return false;
    await this.query('DELETE FROM channel_messages WHERE "channelId" = $1', [id]);
    await this.query('DELETE FROM channels WHERE id = $1', [id]);
    return true;
  }

  async deleteDirectMessage(id) {
    const dm = await this.directMessageById(id);
    if (!dm) return false;
    await this.query('DELETE FROM dm_messages WHERE "dmId" = $1', [id]);
    await this.query('DELETE FROM "directMessages" WHERE id = $1', [id]);
    return true;
  }

  async columns(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const columns = await this.query(
      `SELECT c.*, COUNT(ca.id) as "articleCount" 
       FROM columns c 
       LEFT JOIN column_articles ca ON c.id = ca."columnId" 
       GROUP BY c.id 
       ORDER BY c."createdAt" DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await this.queryOne('SELECT COUNT(*) as count FROM columns', []);

    return {
      columns,
      total: parseInt(countResult?.count || 0),
      page,
      limit
    };
  }

  async columnById(id) {
    return this.queryOne('SELECT * FROM columns WHERE id = $1', [id]);
  }

  async columnBySlug(slug) {
    return this.queryOne('SELECT * FROM columns WHERE slug = $1', [slug]);
  }

  async createColumn(column) {
    const { id, title, slug, description, authorId, coverColor, isPublic } = column;
    return this.queryOne(
      `INSERT INTO columns (id, title, slug, description, "authorId", "coverColor", "isPublic")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, title, slug, description || '', authorId, coverColor || '#7c3aed', isPublic !== false]
    );
  }

  async columnPosts(columnId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    return this.query(
      `SELECT p.* FROM posts p
       INNER JOIN column_posts cp ON p.id = cp."postId"
       WHERE cp."columnId" = $1
       ORDER BY cp."addedAt" DESC
       LIMIT $2 OFFSET $3`,
      [columnId, limit, offset]
    );
  }

  async addColumnArticle(columnId, article) {
    const column = await this.columnById(columnId);
    if (!column) return null;

    const { id, title, summary, content, tags, readTime, postId } = article;
    const result = await this.queryOne(
      `INSERT INTO column_articles (id, "columnId", "postId", title, summary, content, tags, "readTime")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, columnId, postId, title, summary || '', content || '', tags || [], readTime || 1]
    );

    if (postId) {
      await this.query(
        `INSERT INTO column_posts (id, "columnId", "postId") VALUES ($1, $2, $3)
         ON CONFLICT ("columnId", "postId") DO NOTHING`,
        [crypto.randomUUID(), columnId, postId]
      );
    }

    return result;
  }

  async getColumnArticle(columnId, articleId) {
    const article = await this.queryOne(
      'SELECT * FROM column_articles WHERE id = $1 AND "columnId" = $2',
      [articleId, columnId]
    );
    if (!article) return null;

    await this.query(
      'UPDATE column_articles SET views = views + 1 WHERE id = $1',
      [articleId]
    );
    article.views = (article.views || 0) + 1;
    return article;
  }

  async toggleColumnArticleLike(columnId, articleId, userId) {
    const article = await this.queryOne(
      'SELECT * FROM column_articles WHERE id = $1 AND "columnId" = $2',
      [articleId, columnId]
    );
    if (!article) return null;

    const likes = article.likes || [];
    const likeIdx = likes.indexOf(userId);
    if (likeIdx === -1) {
      likes.push(userId);
    } else {
      likes.splice(likeIdx, 1);
    }

    await this.query(
      'UPDATE column_articles SET likes = $1 WHERE id = $2',
      [likes, articleId]
    );

    return { ...article, likes };
  }

  async toggleColumnFollow(columnId, userId) {
    const column = await this.columnById(columnId);
    if (!column) return null;

    const followers = column.followers || [];
    const idx = followers.indexOf(userId);
    if (idx === -1) {
      followers.push(userId);
    } else {
      followers.splice(idx, 1);
    }

    await this.query(
      'UPDATE columns SET followers = $1 WHERE id = $2',
      [followers, columnId]
    );

    return { followed: idx === -1, followers };
  }

  async close() {
    await this.pool.end();
  }
}

export async function createRepository(type, connectionString, dbInstance) {
  if (type === 'postgres') {
    const repo = new PostgresRepository(connectionString);
    await repo.init();
    return repo;
  }
  const repo = new FileRepository(dbInstance);
  await repo.init();
  return repo;
}