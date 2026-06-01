# Linkist 架构设计文档

---

## 目录

- [1. 系统概述](#1-系统概述)
- [2. 架构设计](#2-架构设计)
  - [2.1. 架构风格](#21-架构风格)
  - [2.2. 分层架构](#22-分层架构)
  - [2.3. 核心组件](#23-核心组件)
- [3. 技术选型](#3-技术选型)
  - [3.1. 前端技术栈](#31-前端技术栈)
  - [3.2. 后端技术栈](#32-后端技术栈)
  - [3.3. 数据库选型](#33-数据库选型)
- [4. 数据模型](#4-数据模型)
  - [4.1. 用户模型](#41-用户模型)
  - [4.2. 帖子模型](#42-帖子模型)
  - [4.3. 频道模型](#43-频道模型)
  - [4.4. 专栏模型](#44-专栏模型)
- [5. 核心业务流程](#5-核心业务流程)
  - [5.1. 用户认证流程](#51-用户认证流程)
  - [5.2. 帖子发布流程](#52-帖子发布流程)
  - [5.3. 实时消息流程](#53-实时消息流程)
- [6. 设计模式](#6-设计模式)
  - [6.1. Repository 模式](#61-repository-模式)
  - [6.2. 服务注册模式](#62-服务注册模式)
- [7. TypeScript 迁移状态](#7-typescript-迁移状态)
- [8. 安全性考虑](#8-安全性考虑)

---

## 1. 系统概述

Linkist 是一个社区平台，提供讨论区、实时频道和专栏创作功能。系统采用前后端分离架构，支持多数据库后端（文件存储 + PostgreSQL），通过 WebSocket 实现实时通信。

---

## 2. 架构设计

### 2.1. 架构风格

采用 **分层架构**（Layered Architecture）与 **微服务思想** 结合的设计：

- **前端层**：React 单页应用，负责用户界面展示和交互
- **API 层**：Express 路由层，处理 HTTP 请求和响应
- **服务层**：业务逻辑处理，实现核心功能
- **数据访问层**：Repository 模式，统一数据访问接口
- **数据存储层**：支持文件存储和 PostgreSQL

### 2.2. 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (React)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Pages / Components / Contexts / Services          │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 层 (Express)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Routes / Middleware / Validation                   │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ 依赖注入
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Services)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  UserService / PostService / ChannelService ...     │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ Repository 接口
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   数据访问层 (Repository)                   │
│  ┌─────────────┐          ┌───────────────────┐          │
│  │ FileDBRepo  │          │ PostgresRepo      │          │
│  └─────────────┘          └───────────────────┘          │
└───────────────────────────┬───────────────────┬───────────┘
                            │                   │
                            ▼                   ▼
                    ┌───────────┐      ┌───────────────┐
                    │  LowDB    │      │  PostgreSQL   │
                    └───────────┘      └───────────────┘
```

### 2.3. 核心组件

| 组件 | 职责 | 位置 |
|------|------|------|
| **services-registry** | 服务注册与依赖注入 | `server/src/services-registry.ts` |
| **Repository** | 数据访问抽象接口 | `server/src/repository/index.ts` |
| **Auth Middleware** | JWT 认证中间件 | `server/src/middleware/auth.js` |
| **Socket.IO** | 实时通信服务 | `server/src/services/socket.js` |
| **Validation** | 请求参数验证 | `server/src/middleware/validation.js` |
| **Error Handler** | 统一错误处理 | `server/src/middleware/errorHandler.ts` |

---

## 3. 技术选型

### 3.1. 前端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| React | 18 | 成熟的 UI 框架，生态完善 |
| React Router | 6 | 官方路由库，支持嵌套路由 |
| Vite | 5 | 快速构建工具，HMR 支持好 |
| Tailwind CSS | 3 | 原子化 CSS，开发效率高 |
| Framer Motion | - | 强大的动画库 |
| Socket.IO Client | 4 | WebSocket 客户端，支持降级 |

### 3.2. 后端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| Express | 4 | 轻量级 Node.js 框架 |
| TypeScript | 5 | 类型安全，代码质量高 |
| JWT | - | 无状态认证，易于扩展 |
| bcryptjs | - | 密码哈希，安全性高 |
| Socket.IO | 4 | 实时通信，支持多协议 |
| Joi | - | 数据验证库 |

### 3.3. 数据库选型

| 数据库 | 适用场景 | 配置方式 |
|--------|----------|----------|
| **LowDB** | 开发环境、轻量部署 | 默认启用 |
| **PostgreSQL** | 生产环境、高并发 | 设置环境变量启用 |

---

## 4. 数据模型

### 4.1. 用户模型

```typescript
interface User {
  id: string;                    // 用户唯一标识
  username: string;              // 用户名
  email: string;                 // 邮箱
  passwordHash: string;          // 密码哈希
  avatar: string;                // 头像 URL
  bio: string;                   // 个人简介
  xp: number;                    // 经验值
  role: 'user' | 'admin';        // 用户角色
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  preferences: UserPreferences;  // 用户偏好设置
}

interface UserPreferences {
  theme: 'dark' | 'light';       // 主题模式
  accentColor: string;           // 主题色
  fontSize: 'small' | 'medium' | 'large'; // 字号
}
```

### 4.2. 帖子模型

```typescript
interface Post {
  id: string;                    // 帖子唯一标识
  title: string;                 // 帖子标题
  content: string;               // 帖子内容（Markdown）
  authorId: string;              // 作者 ID
  category: string;              // 分类
  tags: string[];                // 标签列表
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  votes: Vote;                   // 投票统计
  status: 'published' | 'draft'; // 状态
  isPinned: boolean;             // 是否置顶
  flair: string;                 // Flair 标签
}

interface Vote {
  up: number;                    // 点赞数
  down: number;                  // 点踩数
  voters: Record<string, 'up' | 'down'>; // 投票记录
}
```

### 4.3. 频道模型

```typescript
interface Channel {
  id: string;                    // 频道唯一标识
  name: string;                  // 频道名称
  description: string;           // 频道描述
  type: 'public' | 'private';    // 频道类型
  ownerId: string;               // 所有者 ID
  members: string[];             // 成员列表
  createdAt: Date;               // 创建时间
  messageCount: number;          // 消息数量
  lastMessage: Message | null;   // 最后一条消息
}

interface Message {
  id: string;                    // 消息唯一标识
  channelId: string;             // 所属频道
  authorId: string;              // 发送者 ID
  content: string;               // 消息内容
  createdAt: Date;               // 发送时间
  reactions: Reaction[];         // 表情反应
}

interface Reaction {
  emoji: string;                 // 表情符号
  users: string[];               // 反应用户列表
}
```

### 4.4. 专栏模型

```typescript
interface Column {
  id: string;                    // 专栏唯一标识
  name: string;                  // 专栏名称
  description: string;           // 专栏描述
  authorId: string;              // 作者 ID
  followers: string[];           // 关注者列表
  createdAt: Date;               // 创建时间
  articles: Article[];           // 文章列表
}

interface Article {
  id: string;                    // 文章唯一标识
  columnId: string;              // 所属专栏
  title: string;                 // 文章标题
  content: string;               // 文章内容（Markdown）
  authorId: string;              // 作者 ID
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  likes: string[];               // 点赞用户列表
  readTime: number;              // 预计阅读时间（分钟）
}
```

---

## 5. 核心业务流程

### 5.1. 用户认证流程

```
用户请求 → 前端 → API/auth/login → 验证 → JWT 生成 → 返回 token
     │                                              │
     └───────────────────────────────────────────────┘
                    后续请求携带 Authorization: Bearer <token>
```

**流程说明**：
1. 用户提交登录表单
2. 前端调用 `/api/auth/login`
3. 后端验证邮箱和密码
4. 生成 JWT（有效期 7 天）
5. 返回 token 和用户信息
6. 前端存储 token，后续请求携带

### 5.2. 帖子发布流程

```
用户编辑 → 前端验证 → API/posts → PostService → Repository → 数据库
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                           返回帖子详情
```

**流程说明**：
1. 用户填写帖子内容
2. 前端验证必填字段
3. 调用 `/api/posts` 创建帖子
4. PostService 处理业务逻辑（添加经验值等）
5. Repository 持久化数据
6. 返回创建的帖子

### 5.3. 实时消息流程

```
用户发送 → Socket.IO → 服务端处理 → 广播给频道成员 → 前端渲染
     │                                              │
     └───────────────────────────────────────────────┘
                        消息持久化
```

**流程说明**：
1. 用户发送消息
2. 通过 WebSocket 发送到服务端
3. ChannelService 处理消息
4. 持久化到数据库
5. 广播给频道所有在线成员
6. 前端实时渲染新消息

---

## 6. 设计模式

### 6.1. Repository 模式

**设计意图**：统一数据访问接口，实现数据存储解耦。

```typescript
// 接口定义
interface Repository {
  // 用户相关
  createUser(user: User): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  
  // 帖子相关
  createPost(post: Post): Promise<Post>;
  getPostById(id: string): Promise<Post | null>;
  getPosts(query?: PostQuery): Promise<{ posts: Post[]; total: number }>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<boolean>;
  
  // ... 其他方法
}
```

**实现类**：
- `FileDBRepository`：基于 LowDB 的文件存储实现
- `PostgresRepository`：基于 PostgreSQL 的关系型数据库实现

### 6.2. 服务注册模式

**设计意图**：集中管理服务实例，实现依赖注入。

```typescript
// services-registry.ts
export interface Services {
  repo: Repository;
  user: UserService;
  post: PostService;
  channel: ChannelService;
  friend: FriendService;
  notification: NotificationService;
  poll: PollService;
  tag: TagService;
  column: ColumnService;
}

export let services: Services = {} as Services;

export async function initServices() {
  // 初始化数据库
  await initDatabase();
  
  // 创建 Repository 实例
  const repo = await getRepository();
  
  // 创建服务实例
  const userService = new UserService(repo);
  const postService = new PostService(repo, userService);
  
  // 注册服务
  services = {
    repo,
    user: userService,
    post: postService,
    channel: new ChannelService(repo),
    friend: new FriendService(repo),
    notification: new NotificationService(repo),
    poll: new PollService(repo),
    tag: new TagService(repo),
    column: new ColumnService(repo)
  };
  
  return services;
}
```

**使用方式**：

```typescript
// 在路由或其他地方获取服务
import { getServices } from '../services-registry';

const { user, post } = getServices();
const user = await user.getUserById(userId);
const posts = await post.getPosts();
```

---

## 7. TypeScript 迁移状态

### 迁移进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 入口文件 | ✅ 完成 | `src/index.ts` → `dist/index.js` |
| 服务类 | ✅ 完成 | 8个 Service 类已转为 `.ts` |
| 配置文件 | ✅ 完成 | `config/index.ts` |
| 工具函数 | ✅ 完成 | `utils/logger.ts`, `utils/apiResponse.ts` |
| 类型定义 | ✅ 完成 | `types/index.ts` |
| Repository 接口 | ✅ 完成 | `repository/index.ts` |
| 路由层 | 🔄 进行中 | `routes/*.js` - 文件已移入 `src/`，尚未转为 `.ts` |
| 中间件 | 🔄 进行中 | `middleware/*.js` - 文件已移入 `src/`，尚未转为 `.ts` |
| 数据层 | 🔄 进行中 | `data/*.js` - 文件已移入 `src/`，尚未转为 `.ts` |

### 当前配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 注意事项

1. **入口点**：生产环境入口是 `dist/index.js`，不是根目录的 `index.js`
2. **幽灵文件已删除**：根目录的旧 `.js` 文件已被删除，避免误修改
3. **过渡策略**：`allowJs: true, checkJs: false` 允许 `.js` 文件存在但不进行类型检查
4. **Dockerfile 已更新**：构建时执行 `npm run build`，启动时使用 `dist/index.js`

### 后续计划

- [ ] 将 `routes/*.js` 转为 `.ts` 并添加类型定义
- [ ] 将 `middleware/*.js` 转为 `.ts` 并添加类型定义
- [ ] 将 `data/*.js` 转为 `.ts` 并添加类型定义
- [ ] 启用 `strict: true` 的完整检查

---

## 8. 安全性考虑

| 安全方面 | 措施 |
|----------|------|
| **密码安全** | 使用 bcryptjs 进行密码哈希 |
| **JWT 认证** | 短有效期（7天），使用环境变量存储密钥 |
| **输入验证** | Joi 验证所有请求参数 |
| **XSS 防护** | 前端使用 react-markdown 转义，后端 sanitizeInput |
| **CSRF 防护** | 使用 JWT 无状态认证，天然防护 |
| **文件上传** | 限制文件类型和大小，存储在非 Web 可访问目录 |
| **SQL 注入** | 使用参数化查询（PostgreSQL）或 ORM（LowDB） |
| **CORS 配置** | 限制允许的来源域名 |
| **速率限制** | 使用 express-rate-limit 防止暴力攻击 |