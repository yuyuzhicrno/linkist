# API 接口文档

---

## 目录

- [1. 认证接口](#1-认证接口)
- [2. 帖子接口](#2-帖子接口)
- [3. 频道接口](#3-频道接口)
- [4. 专栏接口](#4-专栏接口)
- [5. 用户接口](#5-用户接口)
- [6. 好友接口](#6-好友接口)
- [7. 投票接口](#7-投票接口)
- [8. 通知接口](#8-通知接口)
- [9. 标签接口](#9-标签接口)
- [10. 讨论区接口](#10-讨论区接口)

---

## 通用说明

### 基础路径

所有 API 接口的基础路径为 `/api`

### 认证方式

使用 JWT 认证，在请求头中携带：

```
Authorization: Bearer <token>
```

### 响应格式

**成功响应**：
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**：
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 1. 认证接口

### 1.1 注册

**路径**：`POST /api/auth/register`

**请求体**：
```json
{
  "username": "string",    // 用户名（必填）
  "email": "string",       // 邮箱（必填）
  "password": "string"     // 密码（必填，至少6位）
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "message": "注册成功，现在可以登录了"
}
```

**错误响应**（409）：
```json
{
  "success": false,
  "error": "用户名已被注册"
}
```

### 1.2 登录

**路径**：`POST /api/auth/login`

**请求体**：
```json
{
  "email": "string",       // 邮箱（必填）
  "password": "string"     // 密码（必填）
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "bio": "string",
    "xp": 100,
    "role": "user"
  }
}
```

**错误响应**（401）：
```json
{
  "success": false,
  "error": "邮箱或密码错误"
}
```

### 1.3 获取当前用户

**路径**：`GET /api/auth/me`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "bio": "string",
    "xp": 100,
    "role": "user",
    "preferences": {
      "theme": "dark",
      "accentColor": "#8b5cf6",
      "fontSize": "medium"
    }
  }
}
```

---

## 2. 帖子接口

### 2.1 获取帖子列表

**路径**：`GET /api/posts`

**查询参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| `sort` | string | 排序方式：`hot`（默认）、`new`、`top` |
| `category` | string | 分类筛选 |
| `tag` | string | 标签筛选 |
| `search` | string | 搜索关键词 |
| `limit` | number | 每页数量（默认 20） |
| `offset` | number | 偏移量（默认 0） |

**成功响应**（200）：
```json
{
  "success": true,
  "posts": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "authorId": "string",
      "author": {
        "id": "string",
        "username": "string",
        "avatar": "string"
      },
      "category": "string",
      "tags": ["tag1", "tag2"],
      "votes": { "up": 10, "down": 2 },
      "commentCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isPinned": false,
      "flair": "string"
    }
  ],
  "total": 100
}
```

### 2.2 获取帖子详情

**路径**：`GET /api/posts/:id`

**路径参数**：
- `id`: 帖子 ID

**成功响应**（200）：
```json
{
  "success": true,
  "post": {
    "id": "string",
    "title": "string",
    "content": "string",
    "authorId": "string",
    "author": {
      "id": "string",
      "username": "string",
      "avatar": "string"
    },
    "category": "string",
    "tags": ["tag1", "tag2"],
    "votes": { "up": 10, "down": 2 },
    "comments": [...],
    "poll": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "isPinned": false,
    "flair": "string"
  }
}
```

**错误响应**（404）：
```json
{
  "success": false,
  "error": "帖子不存在"
}
```

### 2.3 创建帖子

**路径**：`POST /api/posts`

**认证**：需要

**请求体**：
```json
{
  "title": "string",        // 标题（必填）
  "content": "string",      // 内容（必填，Markdown）
  "category": "string",     // 分类（必填）
  "tags": ["string"],       // 标签（可选）
  "poll": {                 // 投票（可选）
    "question": "string",
    "options": ["选项1", "选项2"],
    "allowMultiple": false,
    "expiresAt": "2024-01-15T00:00:00.000Z"
  }
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "post": { ... }
}
```

### 2.4 更新帖子

**路径**：`PUT /api/posts/:id`

**认证**：需要（仅作者或管理员）

**请求体**：
```json
{
  "title": "string",        // 标题（可选）
  "content": "string",      // 内容（可选）
  "category": "string",     // 分类（可选）
  "tags": ["string"]        // 标签（可选）
}
```

### 2.5 删除帖子

**路径**：`DELETE /api/posts/:id`

**认证**：需要（仅作者或管理员）

**成功响应**（200）：
```json
{
  "success": true,
  "message": "删除成功"
}
```

### 2.6 帖子投票

**路径**：`POST /api/posts/:id/vote`

**认证**：需要

**请求体**：
```json
{
  "vote": "up" | "down" | "none"
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "post": {
    "votes": { "up": 11, "down": 2 },
    "userVote": "up"
  }
}
```

### 2.7 创建评论

**路径**：`POST /api/posts/:id/comments`

**认证**：需要

**请求体**：
```json
{
  "content": "string"       // 评论内容（必填）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "comment": {
    "id": "string",
    "postId": "string",
    "authorId": "string",
    "content": "string",
    "votes": { "up": 0, "down": 0 },
    "replies": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.8 回复评论

**路径**：`POST /api/posts/:id/comments/:commentId/replies`

**认证**：需要

**请求体**：
```json
{
  "content": "string"       // 回复内容（必填）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "reply": {
    "id": "string",
    "parentId": "string",
    "authorId": "string",
    "content": "string",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.9 评论投票

**路径**：`POST /api/posts/:id/comments/:commentId/vote`

**认证**：需要

**请求体**：
```json
{
  "type": "up" | "down"    // 投票类型（必填）
}
```

**成功响应**（200）：
```json
{
  "upvotes": 5,
  "downvotes": 2
}
```

**错误响应**（400）：
```json
{
  "error": "Invalid vote type. Must be \"up\" or \"down\""
}
```

**错误响应**（404）：
```json
{
  "error": "Comment not found"
}
```

### 2.10 更新评论

**路径**：`PUT /api/posts/:id/comments/:commentId`

**认证**：需要（仅作者或管理员）

**请求体**：
```json
{
  "content": "string"       // 评论内容（必填）
}
```

**成功响应**（200）：
```json
{
  "id": "string",
  "postId": "string",
  "authorId": "string",
  "content": "string",
  "upvotes": ["userId1", "userId2"],
  "downvotes": [],
  "replies": [],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2.11 删除评论

**路径**：`DELETE /api/posts/:id/comments/:commentId`

**认证**：需要（仅作者或管理员）

**成功响应**（200）：
```json
{
  "success": true
}
```

### 2.12 置顶帖子

**路径**：`PATCH /api/posts/:id/pin`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "isPinned": true
}
```

---

## 3. 频道接口

### 3.1 获取频道列表

**路径**：`GET /api/channels`

**查询参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | `public`（默认）或 `private` |

**成功响应**（200）：
```json
{
  "success": true,
  "channels": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "public",
      "ownerId": "string",
      "memberCount": 100,
      "messageCount": 500,
      "lastMessage": {
        "id": "string",
        "content": "string",
        "authorId": "string",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3.2 获取频道详情

**路径**：`GET /api/channels/:id`

**认证**：公开频道无需认证，私密频道需要认证

**成功响应**（200）：
```json
{
  "success": true,
  "channel": {
    "id": "string",
    "name": "string",
    "description": "string",
    "type": "public",
    "ownerId": "string",
    "members": [...],
    "messages": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3.3 创建频道

**路径**：`POST /api/channels`

**认证**：需要（等级 3+ 或管理员）

**请求体**：
```json
{
  "name": "string",        // 频道名称（必填）
  "description": "string", // 频道描述（可选）
  "type": "public" | "private" // 类型（默认 public）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "channel": { ... }
}
```

**错误响应**（403）：
```json
{
  "success": false,
  "error": "需要达到 3 级才能创建频道"
}
```

### 3.4 加入频道

**路径**：`POST /api/channels/:id/join`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "channel": { ... }
}
```

### 3.5 发送消息

**路径**：`POST /api/channels/:id/messages`

**认证**：需要（必须是频道成员）

**请求体**：
```json
{
  "content": "string"       // 消息内容（必填）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "message": {
    "id": "string",
    "channelId": "string",
    "authorId": "string",
    "content": "string",
    "reactions": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3.6 表情反应

**路径**：`POST /api/channels/:id/messages/:msgId/react`

**认证**：需要

**请求体**：
```json
{
  "emoji": "string"        // 表情符号（如 👍、❤️）
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "message": {
    "reactions": [
      { "emoji": "👍", "users": ["userId1", "userId2"] }
    ]
  }
}
```

### 3.7 标记已读

**路径**：`POST /api/channels/:id/read`

**认证**：需要

**请求体**：
```json
{
  "messageId": "string"     // 已读消息 ID
}
```

**成功响应**（200）：
```json
{
  "success": true
}
```

---

## 4. 专栏接口

### 4.1 获取专栏列表

**路径**：`GET /api/columns`

**查询参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| `authorId` | string | 作者 ID 筛选 |

**成功响应**（200）：
```json
{
  "success": true,
  "columns": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "authorId": "string",
      "author": { ... },
      "followerCount": 100,
      "articleCount": 10,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 4.2 获取专栏详情

**路径**：`GET /api/columns/:id`

**成功响应**（200）：
```json
{
  "success": true,
  "column": {
    "id": "string",
    "name": "string",
    "description": "string",
    "authorId": "string",
    "author": { ... },
    "followers": [...],
    "articles": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4.3 创建专栏

**路径**：`POST /api/columns`

**认证**：需要

**请求体**：
```json
{
  "name": "string",        // 专栏名称（必填）
  "description": "string"  // 专栏描述（可选）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "column": { ... }
}
```

### 4.4 创建文章

**路径**：`POST /api/columns/:id/articles`

**认证**：需要（仅专栏作者）

**请求体**：
```json
{
  "title": "string",        // 文章标题（必填）
  "content": "string"       // 文章内容（必填，Markdown）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "article": {
    "id": "string",
    "columnId": "string",
    "title": "string",
    "content": "string",
    "authorId": "string",
    "readTime": 5,
    "likeCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4.5 点赞文章

**路径**：`POST /api/columns/:id/articles/:artId/like`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "article": {
    "likeCount": 1,
    "liked": true
  }
}
```

### 4.6 关注专栏

**路径**：`POST /api/columns/:id/follow`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "column": {
    "followerCount": 101,
    "followed": true
  }
}
```

---

## 5. 用户接口

### 5.1 获取用户资料

**路径**：`GET /api/users/:id`

**成功响应**（200）：
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "avatar": "string",
    "bio": "string",
    "xp": 100,
    "level": 2,
    "postCount": 10,
    "columnCount": 2,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5.2 更新个人资料

**路径**：`PUT /api/users/me`

**认证**：需要

**请求体**：
```json
{
  "username": "string",     // 用户名（可选）
  "bio": "string",         // 个人简介（可选）
  "preferences": {         // 偏好设置（可选）
    "theme": "dark" | "light",
    "accentColor": "#8b5cf6",
    "fontSize": "small" | "medium" | "large"
  }
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "user": { ... }
}
```

### 5.3 上传头像

**路径**：`POST /api/users/me/avatar`

**认证**：需要

**Content-Type**：`multipart/form-data`

**请求体**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `avatar` | File | 头像文件（支持 jpg、png、webp） |

**成功响应**（200）：
```json
{
  "success": true,
  "avatarUrl": "/uploads/avatars/xxx.png"
}
```

---

## 6. 好友接口

### 6.1 获取好友列表

**路径**：`GET /api/friends`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "friends": [
    {
      "id": "string",
      "username": "string",
      "avatar": "string",
      "bio": "string"
    }
  ],
  "pendingRequests": [
    {
      "id": "string",
      "requester": {
        "id": "string",
        "username": "string",
        "avatar": "string"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 6.2 发送好友请求

**路径**：`POST /api/friends/request/:targetId`

**认证**：需要

**路径参数**：
- `targetId`: 目标用户 ID

**成功响应**（200）：
```json
{
  "success": true,
  "message": "好友请求已发送"
}
```

### 6.3 接受好友请求

**路径**：`POST /api/friends/accept/:requesterId`

**认证**：需要

**路径参数**：
- `requesterId`: 请求者 ID

**成功响应**（200）：
```json
{
  "success": true,
  "message": "好友请求已接受"
}
```

### 6.4 解除好友关系

**路径**：`DELETE /api/friends/remove/:otherId`

**认证**：需要

**路径参数**：
- `otherId`: 好友 ID

**成功响应**（200）：
```json
{
  "success": true,
  "message": "已解除好友关系"
}
```

### 6.5 获取私信列表

**路径**：`GET /api/friends/dms`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "conversations": [
    {
      "userId": "string",
      "username": "string",
      "avatar": "string",
      "lastMessage": "string",
      "unreadCount": 5,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 6.6 获取私信对话

**路径**：`GET /api/friends/dms/:userId`

**认证**：需要

**路径参数**：
- `userId`: 对方用户 ID

**成功响应**（200）：
```json
{
  "success": true,
  "messages": [
    {
      "id": "string",
      "senderId": "string",
      "content": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 6.7 发送私信

**路径**：`POST /api/friends/dms/:userId`

**认证**：需要

**路径参数**：
- `userId`: 对方用户 ID

**请求体**：
```json
{
  "content": "string"       // 消息内容（必填）
}
```

**成功响应**（201）：
```json
{
  "success": true,
  "message": { ... }
}
```

---

## 7. 投票接口

### 7.1 获取帖子投票

**路径**：`GET /api/polls/post/:postId`

**成功响应**（200）：
```json
{
  "success": true,
  "poll": {
    "id": "string",
    "question": "string",
    "options": [
      { "id": "string", "text": "选项1", "voteCount": 10 },
      { "id": "string", "text": "选项2", "voteCount": 5 }
    ],
    "allowMultiple": false,
    "expiresAt": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "userVotes": ["optionId1"]
  }
}
```

### 7.2 创建投票

**路径**：`POST /api/polls`

**认证**：需要

**请求体**：
```json
{
  "question": "string",           // 问题（必填）
  "options": ["string"],          // 选项（至少2个）
  "postId": "string",             // 关联帖子（可选）
  "allowMultiple": false,         // 是否多选（默认 false）
  "expiresAt": "2024-01-15T00:00:00.000Z" // 截止时间（可选）
}
```

### 7.3 投票

**路径**：`POST /api/polls/:id/vote`

**认证**：需要

**请求体**：
```json
{
  "optionIds": ["string"]         // 选项 ID 列表
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "poll": { ... }
}
```

---

## 8. 通知接口

### 8.1 获取通知列表

**路径**：`GET /api/notifications`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true,
  "notifications": [
    {
      "id": "string",
      "type": "like",
      "title": "有人点赞了你的帖子",
      "message": "xxx 点赞了你的帖子《xxx》",
      "data": { "postId": "string" },
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "unreadCount": 5
}
```

### 8.2 标记单条已读

**路径**：`PUT /api/notifications/:id/read`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true
}
```

### 8.3 全部标记已读

**路径**：`PUT /api/notifications/read-all`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true
}
```

### 8.4 删除通知

**路径**：`DELETE /api/notifications/:id`

**认证**：需要

**成功响应**（200）：
```json
{
  "success": true
}
```

---

## 9. 标签接口

### 9.1 搜索标签

**路径**：`GET /api/tags`

**查询参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词 |
| `limit` | number | 返回数量（默认 20） |

**成功响应**（200）：
```json
{
  "success": true,
  "tags": [
    {
      "name": "string",
      "description": "string",
      "postCount": 100
    }
  ]
}
```

### 9.2 获取标签内容

**路径**：`GET /api/tags/:tag/content`

**成功响应**（200）：
```json
{
  "success": true,
  "posts": [...],
  "channels": [...]
}
```

---

## 10. 讨论区接口

### 10.1 获取社区统计

**路径**：`GET /api/discussion/stats`

**成功响应**（200）：
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1000,
    "totalPosts": 5000,
    "totalComments": 20000,
    "totalChannels": 50,
    "totalColumns": 20,
    "todayActiveUsers": 100
  }
}
```

### 10.2 获取分类列表

**路径**：`GET /api/discussion/categories`

**成功响应**（200）：
```json
{
  "success": true,
  "categories": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "postCount": 1000
    }
  ]
}
```