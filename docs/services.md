# 服务类详解

---

## 目录

- [1. UserService](#1-userservice)
- [2. PostService](#2-postservice)
- [3. ChannelService](#3-channelservice)
- [4. FriendService](#4-friendservice)
- [5. NotificationService](#5-notificationservice)
- [6. PollService](#6-pollservice)
- [7. TagService](#7-tagservice)
- [8. ColumnService](#8-columnservice)

---

## 1. UserService

### 概述

`UserService` 负责用户相关的业务逻辑，包括用户创建、认证、经验值管理等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例，用于数据访问

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createUser` | 创建新用户 | `data: CreateUserInput` | `Promise<User>` |
| `getUserById` | 根据 ID 获取用户 | `id: string` | `Promise<User \| null>` |
| `getUserByEmail` | 根据邮箱获取用户 | `email: string` | `Promise<User \| null>` |
| `getUserByUsername` | 根据用户名获取用户 | `username: string` | `Promise<User \| null>` |
| `updateUser` | 更新用户信息 | `id: string, updates: Partial<User>` | `Promise<User \| null>` |
| `deleteUser` | 删除用户 | `id: string` | `Promise<boolean>` |
| `verifyPassword` | 验证密码 | `email: string, password: string` | `Promise<User \| null>` |
| `addXp` | 添加经验值 | `userId: string, amount: number` | `Promise<User>` |
| `calcLevel` | 计算用户等级 | `xp: number` | `{ level: number, xp: number, nextLevelXp: number }` |
| `updatePreferences` | 更新用户偏好设置 | `userId: string, preferences: UserPreferences` | `Promise<User>` |

### 经验值规则

| 行为 | 经验值 |
|------|--------|
| 发帖 | +10 XP |
| 评论 | +3 XP |
| 创建频道 | +20 XP |
| 接受好友请求 | +5 XP |
| 创建专栏 | +30 XP |
| 发布文章 | +15 XP |

### 等级计算

```
level = floor((sqrt(2 * xp / 100) + 1))
```

| 等级 | 名称 | 所需 XP |
|------|------|---------|
| 1 | 新人 | 0 |
| 2 | 初学者 | 100 |
| 3 | 探索者 | 300 |
| 4 | 贡献者 | 600 |
| 5 | 活跃者 | 1000 |
| 6 | 达人 | 1500 |
| 7 | 专家 | 1900+ |

---

## 2. PostService

### 概述

`PostService` 负责帖子相关的业务逻辑，包括帖子创建、投票、评论等。

### 构造函数

```typescript
constructor(repo: Repository, userService: UserService)
```

**参数**：
- `repo`: Repository 实例
- `userService`: UserService 实例（用于经验值奖励）

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createPost` | 创建帖子 | `data: CreatePostInput` | `Promise<Post>` |
| `getPostById` | 根据 ID 获取帖子 | `id: string` | `Promise<Post \| null>` |
| `getPosts` | 获取帖子列表 | `query?: PostQuery` | `Promise<{ posts: Post[], total: number }>` |
| `updatePost` | 更新帖子 | `id: string, updates: Partial<Post>` | `Promise<Post \| null>` |
| `deletePost` | 删除帖子 | `id: string` | `Promise<boolean>` |
| `votePost` | 帖子投票 | `postId: string, userId: string, vote: 'up' \| 'down' \| 'none'` | `Promise<Post>` |
| `createComment` | 创建评论 | `postId: string, data: CreateCommentInput` | `Promise<Comment>` |
| `getComments` | 获取帖子评论 | `postId: string` | `Promise<Comment[]>` |
| `voteComment` | 评论投票 | `commentId: string, userId: string, vote: 'up' \| 'down' \| 'none'` | `Promise<Comment>` |
| `createReply` | 回复评论 | `commentId: string, data: CreateReplyInput` | `Promise<Comment>` |

### 查询参数

```typescript
interface PostQuery {
  sort?: 'hot' | 'new' | 'top';   // 排序方式
  category?: string;               // 分类筛选
  tag?: string;                    // 标签筛选
  search?: string;                 // 搜索关键词
  limit?: number;                  // 每页数量
  offset?: number;                 // 偏移量
}
```

### 排序逻辑

- **hot**：按投票数 + 时间衰减排序
- **new**：按创建时间降序
- **top**：按投票数降序

---

## 3. ChannelService

### 概述

`ChannelService` 负责频道相关的业务逻辑，包括频道创建、消息发送、表情反应等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createChannel` | 创建频道 | `data: CreateChannelInput` | `Promise<Channel>` |
| `getChannelById` | 根据 ID 获取频道 | `id: string` | `Promise<Channel \| null>` |
| `getChannels` | 获取频道列表 | `type?: 'public' \| 'private'` | `Promise<Channel[]>` |
| `updateChannel` | 更新频道 | `id: string, updates: Partial<Channel>` | `Promise<Channel \| null>` |
| `deleteChannel` | 删除频道 | `id: string` | `Promise<boolean>` |
| `joinChannel` | 加入频道 | `channelId: string, userId: string` | `Promise<Channel>` |
| `leaveChannel` | 离开频道 | `channelId: string, userId: string` | `Promise<Channel>` |
| `sendMessage` | 发送消息 | `channelId: string, data: CreateMessageInput` | `Promise<Message>` |
| `getMessages` | 获取频道消息 | `channelId: string, limit?: number` | `Promise<Message[]>` |
| `addReaction` | 添加表情反应 | `messageId: string, emoji: string, userId: string` | `Promise<Message>` |
| `removeReaction` | 移除表情反应 | `messageId: string, emoji: string, userId: string` | `Promise<Message>` |
| `markAsRead` | 标记频道已读 | `channelId: string, userId: string, messageId: string` | `Promise<void>` |
| `getUnreadCount` | 获取未读消息数 | `channelId: string, userId: string` | `Promise<number>` |

### 创建频道要求

用户等级必须达到 **3 级** 或拥有 **admin** 角色才能创建频道。

---

## 4. FriendService

### 概述

`FriendService` 负责好友关系管理，包括好友请求、私信聊天等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `sendFriendRequest` | 发送好友请求 | `requesterId: string, targetId: string` | `Promise<FriendRequest>` |
| `acceptFriendRequest` | 接受好友请求 | `requesterId: string, accepterId: string` | `Promise<void>` |
| `rejectFriendRequest` | 拒绝好友请求 | `requesterId: string, targetId: string` | `Promise<void>` |
| `removeFriend` | 解除好友关系 | `userId: string, otherId: string` | `Promise<void>` |
| `getFriends` | 获取好友列表 | `userId: string` | `Promise<User[]>` |
| `getPendingRequests` | 获取待处理请求 | `userId: string` | `Promise<FriendRequest[]>` |
| `isFriend` | 检查是否是好友 | `userId: string, otherId: string` | `Promise<boolean>` |
| `sendDM` | 发送私信 | `senderId: string, recipientId: string, content: string` | `Promise<DirectMessage>` |
| `getDMs` | 获取私信对话 | `userId: string, otherId: string` | `Promise<DirectMessage[]>` |
| `getDMConversations` | 获取私信列表 | `userId: string` | `Promise<DMConversation[]>` |

### 好友请求状态

```typescript
type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';
```

---

## 5. NotificationService

### 概述

`NotificationService` 负责通知系统的业务逻辑，包括通知创建、标记已读等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createNotification` | 创建通知 | `userId: string, type: NotificationType, title: string, message: string, data?: object` | `Promise<Notification>` |
| `getNotifications` | 获取用户通知 | `userId: string` | `Promise<Notification[]>` |
| `markAsRead` | 标记单条已读 | `notificationId: string` | `Promise<void>` |
| `markAllAsRead` | 全部标记已读 | `userId: string` | `Promise<void>` |
| `deleteNotification` | 删除通知 | `notificationId: string` | `Promise<boolean>` |
| `getUnreadCount` | 获取未读数量 | `userId: string` | `Promise<number>` |

### 通知类型

```typescript
type NotificationType = 
  | 'like'           // 点赞通知
  | 'comment'        // 评论通知
  | 'reply'          // 回复通知
  | 'friend_request' // 好友请求通知
  | 'friend_accepted' // 好友接受通知
  | 'channel_invite' // 频道邀请通知
  | 'system';        // 系统通知
```

---

## 6. PollService

### 概述

`PollService` 负责投票系统的业务逻辑，包括创建投票、投票操作等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createPoll` | 创建投票 | `data: CreatePollInput` | `Promise<Poll>` |
| `getPollById` | 根据 ID 获取投票 | `id: string` | `Promise<Poll \| null>` |
| `getPollByPostId` | 根据帖子 ID 获取投票 | `postId: string` | `Promise<Poll \| null>` |
| `vote` | 投票 | `pollId: string, userId: string, optionIds: string[]` | `Promise<Poll>` |
| `deletePoll` | 删除投票 | `id: string` | `Promise<boolean>` |

### 投票选项

```typescript
interface PollOption {
  id: string;         // 选项 ID
  text: string;       // 选项文本
  votes: string[];    // 投票用户 ID 列表
}
```

### 投票规则

- **单选投票**：用户只能选择一个选项
- **多选投票**：用户可以选择多个选项（由 `allowMultiple` 控制）
- **截止时间**：投票可以设置截止时间（由 `expiresAt` 控制）

---

## 7. TagService

### 概述

`TagService` 负责标签系统的业务逻辑，包括标签创建、搜索等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createTag` | 创建标签 | `name: string` | `Promise<Tag>` |
| `getTagByName` | 根据名称获取标签 | `name: string` | `Promise<Tag \| null>` |
| `searchTags` | 搜索标签 | `query: string, limit?: number` | `Promise<Tag[]>` |
| `getAllTags` | 获取所有标签 | - | `Promise<Tag[]>` |
| `getTagContent` | 获取标签内容聚合 | `tagName: string` | `Promise<{ posts: Post[], channels: Channel[] }>` |
| `deleteTag` | 删除标签 | `name: string` | `Promise<boolean>` |

### 标签结构

```typescript
interface Tag {
  name: string;              // 标签名称
  description: string;       // 标签描述
  postCount: number;         // 关联帖子数
  createdAt: Date;           // 创建时间
}
```

---

## 8. ColumnService

### 概述

`ColumnService` 负责专栏系统的业务逻辑，包括专栏创建、文章发布等。

### 构造函数

```typescript
constructor(repo: Repository)
```

**参数**：
- `repo`: Repository 实例

### 核心方法

| 方法名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `createColumn` | 创建专栏 | `data: CreateColumnInput` | `Promise<Column>` |
| `getColumnById` | 根据 ID 获取专栏 | `id: string` | `Promise<Column \| null>` |
| `getColumns` | 获取专栏列表 | `authorId?: string` | `Promise<Column[]>` |
| `updateColumn` | 更新专栏 | `id: string, updates: Partial<Column>` | `Promise<Column \| null>` |
| `deleteColumn` | 删除专栏 | `id: string` | `Promise<boolean>` |
| `createArticle` | 创建文章 | `columnId: string, data: CreateArticleInput` | `Promise<Article>` |
| `getArticleById` | 根据 ID 获取文章 | `id: string` | `Promise<Article \| null>` |
| `getArticles` | 获取专栏文章列表 | `columnId: string` | `Promise<Article[]>` |
| `updateArticle` | 更新文章 | `id: string, updates: Partial<Article>` | `Promise<Article \| null>` |
| `deleteArticle` | 删除文章 | `id: string` | `Promise<boolean>` |
| `likeArticle` | 点赞文章 | `articleId: string, userId: string` | `Promise<Article>` |
| `followColumn` | 关注专栏 | `columnId: string, userId: string` | `Promise<Column>` |
| `unfollowColumn` | 取消关注专栏 | `columnId: string, userId: string` | `Promise<Column>` |

### 阅读时间计算

阅读时间基于文章字数计算，默认阅读速度为 **300 字/分钟**。

```typescript
readTime = Math.ceil(wordCount / 300);
```

---

## 服务依赖关系

```
UserService ◄──────────────────────────────────┐
    │                                          │
    ▼                                          │
PostService ───► UserService                   │
    │                                          │
    ▼                                          │
ChannelService                                 │
    │                                          │
    ▼                                          │
FriendService ─────────────────────────────────┤
    │                                          │
    ▼                                          │
NotificationService ───────────────────────────┤
    │                                          │
    ▼                                          │
PollService                                    │
    │                                          │
    ▼                                          │
TagService                                     │
    │                                          │
    ▼                                          │
ColumnService ─────────────────────────────────┘
```

**说明**：
- `PostService` 依赖 `UserService` 用于经验值奖励
- 所有服务都依赖 `Repository` 进行数据访问
- `services-registry` 负责服务的创建和注入