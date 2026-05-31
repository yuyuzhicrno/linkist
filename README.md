# Linkist

一个好用的社区平台，支持讨论区、实时频道和专栏创作。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + React Router 6 |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3（深色/浅色模式，8 种主题色） |
| 动画 | Framer Motion |
| Markdown | react-markdown + remark-gfm |
| 后端框架 | Express 4 + TypeScript |
| 认证 | JWT（bcryptjs 密码哈希） |
| 数据库 | 文件存储（LowDB）+ PostgreSQL 支持 |
| 实时通信 | Socket.IO |

## 功能特性

### 讨论区（Forum）
- 帖子发布/编辑/删除，Markdown 正文
- 分类筛选 + 标签系统 + 全文搜索
- 点赞/点踩投票
- 嵌套评论与回复
- 热门/最新/最高排序
- 帖子置顶、Flair 标签

### 频道（Channels）
- Discord 风格实时聊天布局
- 公开/私密频道
- Emoji 表情反应（👍 ❤️ 😂 🔥 🎉）
- 频道创建（等级 3+ 解锁）
- 成员管理

### 专栏（Columns）
- Markdown 长文章创作与预览
- 自动阅读时长估算（字/300wpm）
- 关注/取消关注专栏
- 文章点赞

### 用户系统
- 注册/登录（JWT 认证，7 天有效期）
- 个人主页（帖子/专栏统计）
- 头像上传（文件存储 + CDN 路径）
- 主题自定义（深色/浅色、8 种主题色、3 档字号）
- 等级系统（1-8+ 级，经验值驱动）

### 社交功能
- 好友系统（申请/接受/解除）
- 私信聊天（未读计数） + WebSocket 实时推送
- 社区统计数据
- 通知系统（点赞/评论/回复/好友请求实时推送）

### 投票系统
- 创建投票（支持单选/多选、截止时间）
- 投票交互
- 与帖子关联

### 等级经验值

| 等级 | 名称 | 所需 XP |
|------|------|---------|
| 1 | 新人 | 0 |
| 2 | 初学者 | 100 |
| 3 | 探索者 | 300 |
| 4 | 贡献者 | 600 |
| 5 | 活跃者 | 1000 |
| 6 | 达人 | 1500 |
| 7 | 专家 | 1900+ |
| 8+ | 传播者+ | 更多... |

发帖 +10XP，评论 +3XP，创建频道 +20XP，接受好友 +5XP，更多 XP 奖励见代码。

## 项目结构

```
linkist/
├── client/                     # React 前端
│   ├── src/
│   │   ├── components/         # 通用组件（Avatar, Button, Card, Input, PollWidget 等）
│   │   ├── contexts/           # AuthContext, ThemeContext
│   │   ├── pages/              # 页面组件（HomePage, ForumPage, ChannelsPage, ColumnsPage 等）
│   │   ├── layouts/            # 布局组件（AppLayout, ChannelLayout, Topbar, MobileNav）
│   │   ├── utils/              # API 封装, 工具函数
│   │   ├── styles/             # 全局样式（CSS 变量, 主题系统, Markdown 排版）
│   │   ├── App.jsx             # 路由定义
│   │   └── main.jsx            # 入口
│   ├── vite.config.js          # Vite 配置（端口 5173，API 代理）
│   └── tailwind.config.js
├── server/                     # Express 后端
│   ├── src/                    # TypeScript 源代码
│   │   ├── services/           # 业务逻辑层（UserService, PostService, ChannelService 等）
│   │   ├── repository/         # 数据访问层接口
│   │   ├── types/              # TypeScript 类型定义
│   │   └── services-registry.ts # 服务注册中心
│   ├── routes/                 # API 路由（auth, posts, channels, columns, users, friends, polls, tags）
│   ├── middleware/             # 认证中间件（authenticate, authenticateWithUser, optionalAuth）
│   ├── data/
│   │   └── db.js               # 内存数据库 + 种子数据
│   ├── dist/                   # TypeScript 编译输出
│   ├── index.js                # 服务入口（端口 3001）
│   ├── tsconfig.json           # TypeScript 配置
│   └── package.json
└── README.md
```

## API 端点

### 认证 `/api/auth`
- `POST /register` — 注册
- `POST /login` — 登录（返回 JWT）
- `GET /me` — 当前用户信息

### 帖子 `/api/posts`
- `GET /` — 帖子列表（sort=hot|new|top, category, tag, search）
- `GET /:id` — 帖子详情（含评论 + 投票）
- `POST /` — 创建帖子
- `POST /:id/vote` — 投票（up/down/none）
- `POST /:id/comments` — 发表评论
- `POST /:id/comments/:commentId/replies` — 回复评论
- `POST /:id/comments/:commentId/vote` — 评论投票
- `DELETE /:id` — 删除帖子

### 频道 `/api/channels`
- `GET /` — 频道列表
- `GET /:id` — 频道详情（含消息）
- `POST /` — 创建频道（等级 3+）
- `POST /:id/join` — 加入频道
- `POST /:id/messages` — 发送消息
- `POST /:id/messages/:msgId/react` — 表情反应

### 专栏 `/api/columns`
- `GET /` — 专栏列表
- `GET /:id` — 专栏详情
- `POST /` — 创建专栏
- `POST /:id/articles` — 发布文章
- `POST /:id/articles/:artId/like` — 喜欢文章
- `POST /:id/follow` — 关注/取关

### 用户 `/api/users`
- `GET /me` — 当前用户资料
- `GET /:id` — 用户公开资料
- `PUT /me` — 更新个人资料
- `POST /me/avatar` — 上传头像

### 好友 `/api/friends`
- `GET /` — 好友列表 + 待处理请求
- `POST /request/:targetId` — 发送好友申请
- `POST /accept/:requesterId` — 接受申请
- `DELETE /remove/:otherId` — 解除好友
- `GET /dms` — 私信列表
- `GET /dms/:userId` — 私信对话
- `POST /dms/:userId` — 发送私信

### 投票 `/api/polls`
- `GET /post/:postId` — 获取帖子投票
- `POST /` — 创建投票
- `POST /:id/vote` — 投票

### 通知 `/api/notifications`
- `GET /` — 获取通知列表
- `PUT /:id/read` — 标记单条已读
- `PUT /read-all` — 全部标记已读
- `DELETE /:id` — 删除通知

### 其他
- `GET /api/discussion/stats` — 社区统计
- `GET /api/discussion/categories` — 分类列表
- `GET /api/tags?q=&limit=` — 标签搜索
- `GET /api/tags/:tag/content` — 标签内容聚合

## 主题系统

- **模式：** 深色/浅色（CSS 变量，`.dark` 类切换）
- **主题色：** 紫罗兰、天青、珊瑚、翡翠、琥珀、玫瑰、青柠、橙焰
- **字号：** 小（14px）/ 中（16px）/ 大（18px）
- 用户偏好自动同步至服务器

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3001 | 后端端口 |
| `JWT_SECRET` | `linkist_dev_secret_2026` | JWT 签名密钥 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的跨域来源 |
| `BASE_URL` | `http://localhost:3001` | 基础 URL |

## 开发命令

```bash
# 后端
cd server
npm install
npm run build    # 编译 TypeScript
npm run dev      # 开发模式
npm test         # 运行测试
npm run lint     # ESLint 检查
npm run format   # Prettier 格式化

# 前端
cd client
npm install
npm run dev      # 开发模式
npm run build    # 生产构建
```

## License

MIT