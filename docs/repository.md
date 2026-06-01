# 数据访问层详解

---

## 目录

- [1. Repository 模式概述](#1-repository-模式概述)
- [2. Repository 接口定义](#2-repository-接口定义)
- [3. FileDBRepository 实现](#3-filedbrepository-实现)
- [4. PostgresRepository 实现](#4-postgresrepository-实现)
- [5. 数据库切换机制](#5-数据库切换机制)
- [6. 数据模型映射](#6-数据模型映射)

---

## 1. Repository 模式概述

### 设计理念

Repository 模式是一种数据访问层设计模式，其核心思想是：

1. **抽象数据访问**：将数据访问逻辑抽象为接口，与具体实现解耦
2. **统一接口**：提供一致的数据访问 API，支持多种数据库后端
3. **业务隔离**：业务逻辑层（Service）只依赖 Repository 接口，不关心具体实现

### 架构位置

```
┌─────────────────────────────────────────────────────────┐
│                    Service 层                          │
│  UserService / PostService / ChannelService ...        │
└─────────────────────────────┬───────────────────────────┘
                              │ 依赖 Repository 接口
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Repository 层                       │
│  ┌─────────────────┐    ┌─────────────────────┐       │
│  │ Repository (接口)│◄───│ FileDBRepository    │       │
│  └─────────────────┘    │ PostgresRepository  │       │
│                         └─────────────────────┘       │
└─────────────────────────────┬───────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────┐                         ┌─────────────────┐
│   LowDB       │                         │   PostgreSQL    │
│   (文件存储)  │                         │   (关系型数据库) │
└───────────────┘                         └─────────────────┘
```

---

## 2. Repository 接口定义

### 接口结构

Repository 接口定义了所有数据访问方法，分为以下几类：

| 类别 | 方法数量 | 说明 |
|------|----------|------|
| 用户管理 | 8 | 用户的增删改查 |
| 帖子管理 | 10 | 帖子、评论、投票的管理 |
| 频道管理 | 8 | 频道和消息的管理 |
| 专栏管理 | 6 | 专栏和文章的管理 |
| 好友管理 | 6 | 好友关系和私信的管理 |
| 通知管理 | 4 | 通知的管理 |
| 标签管理 | 4 | 标签的管理 |

### 用户相关方法

```typescript
interface Repository {
  // 创建用户
  createUser(user: User): Promise<User>;
  
  // 根据 ID 获取用户
  getUserById(id: string): Promise<User | null>;
  
  // 根据邮箱获取用户
  getUserByEmail(email: string): Promise<User | null>;
  
  // 根据用户名获取用户
  getUserByUsername(username: string): Promise<User | null>;
  
  // 更新用户
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  // 删除用户
  deleteUser(id: string): Promise<boolean>;
  
  // 获取所有用户
  getUsers(): Promise<User[]>;
  
  // 获取用户数量
  getUserCount(): Promise<number>;
}
```

### 帖子相关方法

```typescript
interface Repository {
  // 帖子 CRUD
  createPost(post: Post): Promise<Post>;
  getPostById(id: string): Promise<Post | null>;
  getPosts(query?: PostQuery): Promise<{ posts: Post[]; total: number }>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<boolean>;
  
  // 评论 CRUD
  createComment(comment: Comment): Promise<Comment>;
  getCommentById(id: string): Promise<Comment | null>;
  getCommentsByPostId(postId: string): Promise<Comment[]>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null>;
  deleteComment(id: string): Promise<boolean>;
  
  // 投票 CRUD
  createPoll(poll: Poll): Promise<Poll>;
  getPollById(id: string): Promise<Poll | null>;
  getPollByPostId(postId: string): Promise<Poll | null>;
  updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | null>;
  deletePoll(id: string): Promise<boolean>;
}
```

### 频道相关方法

```typescript
interface Repository {
  // 频道 CRUD
  createChannel(channel: Channel): Promise<Channel>;
  getChannelById(id: string): Promise<Channel | null>;
  getChannels(type?: 'public' | 'private'): Promise<Channel[]>;
  updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null>;
  deleteChannel(id: string): Promise<boolean>;
  
  // 消息 CRUD
  createMessage(message: Message): Promise<Message>;
  getMessagesByChannelId(channelId: string, limit?: number): Promise<Message[]>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | null>;
  deleteMessage(id: string): Promise<boolean>;
  
  // 已读追踪
  setChannelRead(channelId: string, userId: string, messageId: string): Promise<void>;
  getChannelRead(channelId: string, userId: string): Promise<string | null>;
}
```

### 专栏相关方法

```typescript
interface Repository {
  // 专栏 CRUD
  createColumn(column: Column): Promise<Column>;
  getColumnById(id: string): Promise<Column | null>;
  getColumns(authorId?: string): Promise<Column[]>;
  updateColumn(id: string, updates: Partial<Column>): Promise<Column | null>;
  deleteColumn(id: string): Promise<boolean>;
  
  // 文章 CRUD
  createArticle(article: Article): Promise<Article>;
  getArticleById(id: string): Promise<Article | null>;
  getArticlesByColumnId(columnId: string): Promise<Article[]>;
  updateArticle(id: string, updates: Partial<Article>): Promise<Article | null>;
  deleteArticle(id: string): Promise<boolean>;
}
```

### 好友相关方法

```typescript
interface Repository {
  // 好友请求
  createFriendRequest(request: FriendRequest): Promise<FriendRequest>;
  getFriendRequest(requesterId: string, targetId: string): Promise<FriendRequest | null>;
  getPendingRequests(targetId: string): Promise<FriendRequest[]>;
  updateFriendRequest(requesterId: string, targetId: string, status: FriendRequestStatus): Promise<void>;
  deleteFriendRequest(requesterId: string, targetId: string): Promise<void>;
  
  // 好友关系
  addFriend(userId: string, friendId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  getFriends(userId: string): Promise<User[]>;
  isFriend(userId: string, friendId: string): Promise<boolean>;
  
  // 私信
  createDirectMessage(dm: DirectMessage): Promise<DirectMessage>;
  getDirectMessages(userId: string, otherId: string): Promise<DirectMessage[]>;
  getDirectMessageConversations(userId: string): Promise<DMConversation[]>;
}
```

### 通知相关方法

```typescript
interface Repository {
  createNotification(notification: Notification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | null>;
  deleteNotification(id: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;
}
```

### 标签相关方法

```typescript
interface Repository {
  createTag(tag: Tag): Promise<Tag>;
  getTagByName(name: string): Promise<Tag | null>;
  getTags(): Promise<Tag[]>;
  searchTags(query: string, limit?: number): Promise<Tag[]>;
  updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null>;
  deleteTag(name: string): Promise<boolean>;
}
```

---

## 3. FileDBRepository 实现

### 概述

`FileDBRepository` 是基于 **LowDB** 的文件存储实现，适合开发环境和轻量级部署。

### 数据结构

LowDB 使用 JSON 文件存储数据，数据结构如下：

```json
{
  "users": [],
  "posts": [],
  "comments": [],
  "polls": [],
  "channels": [],
  "messages": [],
  "columns": [],
  "articles": [],
  "friendRequests": [],
  "directMessages": [],
  "notifications": [],
  "tags": [],
  "channelReads": []
}
```

### 初始化流程

```typescript
class FileDBRepository implements Repository {
  private db: LowdbSync<Data>;
  
  constructor() {
    // 初始化 LowDB
    const adapter = new JSONFile<Data>('data/db.json');
    const defaultData: Data = {
      users: [],
      posts: [],
      comments: [],
      polls: [],
      channels: [],
      messages: [],
      columns: [],
      articles: [],
      friendRequests: [],
      directMessages: [],
      notifications: [],
      tags: [],
      channelReads: []
    };
    this.db = low(adapter, { defaultData });
  }
}
```

### 查询实现示例

```typescript
async getPosts(query?: PostQuery): Promise<{ posts: Post[]; total: number }> {
  let posts = [...this.db.data.posts];
  
  // 分类筛选
  if (query?.category) {
    posts = posts.filter(p => p.category === query.category);
  }
  
  // 标签筛选
  if (query?.tag) {
    posts = posts.filter(p => p.tags.includes(query.tag));
  }
  
  // 搜索
  if (query?.search) {
    const searchLower = query.search.toLowerCase();
    posts = posts.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower)
    );
  }
  
  // 排序
  switch (query?.sort) {
    case 'hot':
      posts.sort((a, b) => (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down));
      break;
    case 'new':
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'top':
      posts.sort((a, b) => (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down));
      break;
  }
  
  // 分页
  const total = posts.length;
  const offset = query?.offset || 0;
  const limit = query?.limit || 20;
  posts = posts.slice(offset, offset + limit);
  
  return { posts, total };
}
```

---

## 4. PostgresRepository 实现

### 概述

`PostgresRepository` 是基于 **PostgreSQL** 的关系型数据库实现，适合生产环境和高并发场景。

### 数据库表结构

#### 用户表 (users)

| 字段 | 类型 | 约束 |
|------|------|------|
| id | VARCHAR(36) | PRIMARY KEY |
| username | VARCHAR(50) | NOT NULL, UNIQUE |
| email | VARCHAR(100) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| avatar | VARCHAR(255) | |
| bio | TEXT | |
| xp | INTEGER | DEFAULT 0 |
| role | VARCHAR(20) | DEFAULT 'user' |
| preferences | JSON | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

#### 帖子表 (posts)

| 字段 | 类型 | 约束 |
|------|------|------|
| id | VARCHAR(36) | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| content | TEXT | NOT NULL |
| author_id | VARCHAR(36) | FOREIGN KEY |
| category | VARCHAR(50) | NOT NULL |
| tags | TEXT[] | |
| votes | JSON | DEFAULT '{"up":0,"down":0}' |
| status | VARCHAR(20) | DEFAULT 'published' |
| is_pinned | BOOLEAN | DEFAULT false |
| flair | VARCHAR(50) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

#### 频道表 (channels)

| 字段 | 类型 | 约束 |
|------|------|------|
| id | VARCHAR(36) | PRIMARY KEY |
| name | VARCHAR(50) | NOT NULL |
| description | TEXT | |
| type | VARCHAR(20) | DEFAULT 'public' |
| owner_id | VARCHAR(36) | FOREIGN KEY |
| members | TEXT[] | |
| message_count | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### 消息表 (messages)

| 字段 | 类型 | 约束 |
|------|------|------|
| id | VARCHAR(36) | PRIMARY KEY |
| channel_id | VARCHAR(36) | FOREIGN KEY |
| author_id | VARCHAR(36) | FOREIGN KEY |
| content | TEXT | NOT NULL |
| reactions | JSON | DEFAULT '[]' |
| created_at | TIMESTAMP | DEFAULT NOW() |

### SQL 查询示例

```typescript
async getPosts(query?: PostQuery): Promise<{ posts: Post[]; total: number }> {
  let sql = `
    SELECT p.*, 
           u.username as author_username, 
           u.avatar as author_avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIdx = 1;
  
  // 分类筛选
  if (query?.category) {
    sql += ` AND p.category = $${paramIdx++}`;
    params.push(query.category);
  }
  
  // 标签筛选
  if (query?.tag) {
    sql += ` AND $${paramIdx++} = ANY(p.tags)`;
    params.push(query.tag);
  }
  
  // 搜索
  if (query?.search) {
    sql += ` AND (p.title ILIKE $${paramIdx} OR p.content ILIKE $${paramIdx})`;
    params.push(`%${query.search}%`);
  }
  
  // 排序
  switch (query?.sort) {
    case 'hot':
      sql += ' ORDER BY ((p.votes->>\'up\')::int - (p.votes->>\'down\')::int) DESC';
      break;
    case 'new':
      sql += ' ORDER BY p.created_at DESC';
      break;
    case 'top':
      sql += ' ORDER BY ((p.votes->>\'up\')::int - (p.votes->>\'down\')::int) DESC';
      break;
    default:
      sql += ' ORDER BY p.created_at DESC';
  }
  
  // 分页
  const offset = query?.offset || 0;
  const limit = query?.limit || 20;
  sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);
  
  const result = await this.pool.query(sql, params);
  
  // 获取总数
  const countResult = await this.pool.query('SELECT COUNT(*) FROM posts WHERE 1=1', params.slice(0, -2));
  
  return {
    posts: result.rows.map(row => ({
      ...row,
      votes: JSON.parse(row.votes),
      author: {
        id: row.author_id,
        username: row.author_username,
        avatar: row.author_avatar
      }
    })),
    total: parseInt(countResult.rows[0].count)
  };
}
```

---

## 5. 数据库切换机制

### 配置方式

通过环境变量 `DB_TYPE` 来选择数据库类型：

```bash
# .env 文件
DB_TYPE=postgres  # 或 "file"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkist
DB_USER=postgres
DB_PASSWORD=password
```

### 初始化逻辑

```typescript
// data/db.js
export async function getRepository(): Promise<Repository> {
  const dbType = process.env.DB_TYPE || 'file';
  
  if (dbType === 'postgres') {
    // 初始化 PostgreSQL
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'linkist',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    });
    
    // 测试连接
    await pool.connect();
    
    return new PostgresRepository(pool);
  } else {
    // 默认使用文件存储
    return new FileDBRepository();
  }
}
```

---

## 6. 数据模型映射

### 通用字段映射

| JavaScript 字段 | PostgreSQL 字段 | 说明 |
|-----------------|-----------------|------|
| id | id | 保持一致 |
| createdAt | created_at | 下划线命名 |
| updatedAt | updated_at | 下划线命名 |
| authorId | author_id | 下划线命名 |
| postId | post_id | 下划线命名 |
| channelId | channel_id | 下划线命名 |

### 嵌套对象处理

在 PostgreSQL 中，嵌套对象通常存储为 JSON 类型：

```typescript
// JavaScript 对象
const user = {
  id: 'xxx',
  username: 'john',
  preferences: {
    theme: 'dark',
    accentColor: '#8b5cf6'
  }
};

// PostgreSQL 存储
// preferences 字段存储为 JSON: '{"theme":"dark","accentColor":"#8b5cf6"}'
```

### 数组字段处理

```typescript
// JavaScript
const post = {
  id: 'xxx',
  tags: ['react', 'typescript']
};

// PostgreSQL
// tags 字段存储为 TEXT[]: ['react', 'typescript']
```