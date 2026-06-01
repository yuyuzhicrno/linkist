# Linkist

一个功能丰富的社区平台，支持讨论区、实时频道和专栏创作。

---

## 📖 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目架构](#项目架构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [API 接口](#api-接口)
- [文档目录](#文档目录)
- [许可证](#许可证)

---

## ✨ 功能特性

### 讨论区（Forum）
- ✅ 帖子发布/编辑/删除，支持 Markdown 格式
- ✅ 分类筛选 + 标签系统 + 全文搜索
- ✅ 点赞/点踩投票机制
- ✅ 嵌套评论与回复功能
- ✅ 热门/最新/最高排序
- ✅ 帖子置顶、Flair 标签

### 频道（Channels）
- ✅ Discord 风格实时聊天布局
- ✅ 公开/私密频道类型
- ✅ Emoji 表情反应（👍 ❤️ 😂 🔥 🎉）
- ✅ 频道创建（等级 3+ 解锁）
- ✅ 成员管理与权限控制

### 专栏（Columns）
- ✅ Markdown 长文章创作与实时预览
- ✅ 自动阅读时长估算（字/300wpm）
- ✅ 关注/取消关注专栏
- ✅ 文章点赞与统计

### 用户系统
- ✅ 注册/登录（JWT 认证，7 天有效期）
- ✅ 个人主页（帖子/专栏统计展示）
- ✅ 头像上传（文件存储 + CDN 路径）
- ✅ 主题自定义（深色/浅色、8 种主题色、3 档字号）
- ✅ 等级系统（1-8+ 级，经验值驱动）

### 社交功能
- ✅ 好友系统（申请/接受/解除）
- ✅ 私信聊天（未读计数）+ WebSocket 实时推送
- ✅ 社区统计数据
- ✅ 通知系统（点赞/评论/回复/好友请求实时推送）

### 投票系统
- ✅ 创建投票（支持单选/多选、截止时间）
- ✅ 投票交互与结果展示
- ✅ 与帖子关联

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React | 18 | UI 框架 |
| 路由 | React Router | 6 | 前端路由管理 |
| 构建工具 | Vite | 5 | 快速构建工具 |
| 样式方案 | Tailwind CSS | 3 | CSS 框架（深色/浅色模式） |
| 动画 | Framer Motion | - | 动画库 |
| Markdown | react-markdown + remark-gfm | - | Markdown 渲染 |
| 后端框架 | Express | 4 | Node.js Web 框架 |
| 语言 | TypeScript | 5 | 类型安全 |
| 认证 | JWT + bcryptjs | - | 身份认证 |
| 数据库 | LowDB + PostgreSQL | - | 文件存储 + 关系型数据库 |
| 实时通信 | Socket.IO | 4 | WebSocket 实时通信 |

---

## 🏗️ 项目架构

```
linkist/
├── client/                    # React 前端应用
│   ├── src/
│   │   ├── components/        # 组件库（UI组件、业务组件）
│   │   ├── contexts/          # React Context（全局状态管理）
│   │   ├── pages/             # 页面组件
│   │   ├── services/          # 前端服务层（Socket.IO等）
│   │   ├── store/             # 状态管理
│   │   ├── styles/            # 全局样式与主题
│   │   ├── utils/             # 工具函数与API封装
│   │   ├── App.jsx            # 根组件与路由
│   │   └── main.jsx           # 应用入口
│   └── package.json
├── server/                    # Express 后端服务
│   ├── src/                   # TypeScript 源代码
│   │   ├── config/            # 配置管理
│   │   ├── data/              # 数据访问层（Repository模式）
│   │   ├── middleware/        # 中间件（认证、错误处理、验证）
│   │   ├── repository/        # Repository接口定义
│   │   ├── routes/            # API路由定义
│   │   ├── services/          # 业务逻辑层（Service类）
│   │   ├── types/             # TypeScript类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── index.ts           # 服务入口
│   │   └── services-registry.ts # 服务注册中心
│   ├── dist/                  # TypeScript编译输出（生产入口）
│   └── package.json
├── docs/                      # 技术文档
│   ├── architecture.md        # 架构设计文档
│   ├── api.md                 # API接口文档
│   ├── services.md            # 服务类详解
│   ├── repository.md          # 数据访问层详解
│   ├── frontend.md            # 前端架构文档
│   └── setup.md               # 部署配置指南
└── README.md
```

### 架构设计原则

1. **分层架构**：前端 → API层 → 服务层 → 数据访问层 → 数据库
2. **TypeScript 迁移**：源代码在 `src/`，编译后输出到 `dist/`
3. **依赖注入**：通过 `services-registry` 实现服务解耦
3. **Repository模式**：统一数据访问接口，支持多数据库实现
4. **单一职责**：每个服务/组件只负责一个功能领域

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14（可选，默认使用文件存储）

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd linkist

# 2. 安装后端依赖
cd server
npm install

# 3. 安装前端依赖
cd ../client
npm install

# 4. 配置环境变量（可选）
# 复制 .env.example 为 .env 并修改配置
```

### 运行项目

```bash
# 启动后端服务（开发模式）
cd server
npm run dev

# 启动前端开发服务器
cd client
npm run dev

# 访问应用
# 前端: http://localhost:5173
# 后端API: http://localhost:3001
```

### 生产构建

```bash
# 后端编译 TypeScript（输出到 dist/）
cd server
npm run build

# 后端启动（使用 dist/index.js）
npm start

# 前端构建
cd client
npm run build
```

**注意**：生产环境入口是 `dist/index.js`，不是根目录的 `index.js`。

---

## 📚 开发指南

### 后端开发

```bash
# 编译 TypeScript
npm run build

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test

# ESLint 检查
npm run lint

# Prettier 格式化
npm run format
```

### 前端开发

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 运行测试
npm run test

# ESLint 检查
npm run lint
```

---

## 🔌 API 接口

### 认证 `/api/auth`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录（返回 JWT） | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |

### 帖子 `/api/posts`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/` | 帖子列表（支持排序、筛选、搜索） | 否 |
| GET | `/:id` | 帖子详情（含评论+投票） | 否 |
| POST | `/` | 创建帖子 | 是 |
| POST | `/:id/vote` | 帖子投票（up/down/none） | 是 |
| POST | `/:id/comments` | 发表评论 | 是 |
| POST | `/:id/comments/:commentId/replies` | 回复评论 | 是 |
| DELETE | `/:id` | 删除帖子 | 是 |

### 完整 API 文档

请查看 [docs/api.md](docs/api.md) 获取详细的 API 说明。

---

## 📁 文档目录

| 文档 | 说明 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 系统架构设计与技术选型 |
| [docs/api.md](docs/api.md) | 完整 API 接口文档 |
| [docs/services.md](docs/services.md) | 服务类详解（每个类的功能、方法、职责） |
| [docs/repository.md](docs/repository.md) | 数据访问层详解 |
| [docs/frontend.md](docs/frontend.md) | 前端架构与组件设计 |
| [docs/setup.md](docs/setup.md) | 部署配置与环境变量说明 |

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！