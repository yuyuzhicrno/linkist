# Linkist 代码质量评估报告 - 第8轮

**评估日期**: 2026-05-31  
**上一轮扩展性评分**: 91/100  
**本轮评分**: 89/100 (-2)

---

## 一、项目结构概览

| 目录 | 文件数 | 说明 |
|------|--------|------|
| `server/routes/` | 10 个 JS 文件 | Express 路由层 |
| `server/src/services/` | 9 个 TS 文件 | TypeScript 业务服务层 |
| `server/dist/services/` | 9 个 JS + 9 个 d.ts + map | 编译输出完整 |
| `server/data/repository.js` | 1 个文件 (~52KB) | 双仓库持久化层 |
| `server/middleware/` | 3 个 JS 文件 | 认证、验证、错误处理 |
| `server/utils/` | 2 个 JS 文件 | 日志、工具 |
| `server/__tests__/` | 14 个文件 | 测试套件 |
| `client/src/` | ~40+ 组件/页面 | React 前端 |

---

## 二、发现的问题（按类别）

### 2.1 代码重复（Code Duplication）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/routes/columns.js:8-15` | 独立定义 `getUser` 辅助函数 | 低 |
| `server/routes/friends.js:7-14` | 独立定义 `getUser` 辅助函数 | 低 |
| `server/routes/notifications.js:7-14` | 独立定义 `getUser` 辅助函数 | 低 |
| `server/routes/polls.js:7-14` | 独立定义 `getUser` 辅助函数 | 低 |

**说明**: `auth.js` 已导出 `getUser`，`discussion.js` 正确导入复用，但上述4个路由仍各自重复定义相同函数。

### 2.2 未使用导入（Unused Imports）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/routes/posts.js:5` | 导入 `asyncHandler` 但所有路由使用 try-catch | 低 |

### 2.3 参数/接口不匹配（Interface Mismatch）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/src/services/PostService.ts:126` | `voteComment` 签名接受 `voteType` 参数但实现未使用 | 中 |
| `server/routes/posts.js` | 调用 `voteComment` 时未传递 `type` 参数 | 中 |
| `server/middleware/validation.js:150` | `votePoll` schema 定义 `optionId` (字符串)，但路由接收 `optionIds` (数组) | **高** |

### 2.4 逻辑缺陷（Logic Bugs）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/src/services/PollService.ts:46-48` | `votePoll` 重新投票时清除旧选择但未递减 `totalVotes`，导致总数只增不减 | **高** |
| `server/data/repository.js:507-508` | `FileRepository.deleteComment` 递减 `post.commentCount` 但未调用 `updatePost` 保存 | 中 |

### 2.5 命名与职责问题（Naming & Responsibility）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/src/services/TagService.ts` | `getColumns()` 方法实际调用 `repo.columns()`，职责应属 `ColumnService` | 低 |
| `server/routes/users.js:112-146` | `/` 和 `/search` 两个端点功能重复，参数名不一致 (`q` vs `query`) | 低 |

### 2.6 日志一致性（Logging Consistency）

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `server/routes/friends.js` | 部分错误处理使用 `console.error` 而非 `logger.error` | 低 |
| `server/routes/notifications.js` | 部分错误处理使用 `console.error` 而非 `logger.error` | 低 |

---

## 三、测试覆盖情况

### 服务端测试
- **测试文件**: 11 个
- **测试用例**: ~183 个 `it()` 块
- **覆盖模块**: 8 个 Service + 1 个路由 + 1 个中间件 + 1 个配置
- **未覆盖**: `channels.js`, `columns.js`, `discussion.js`, `friends.js`, `notifications.js`, `polls.js`, `posts.js`, `tags.js`, `users.js` 路由测试缺失（仅 `auth.test.js`）

### 客户端测试
- **测试文件**: 5 个
- **测试用例**: ~31 个 `test()` 块
- **覆盖**: 仅基础 UI 组件 (`Avatar`, `Button`, `Card`, `Input`) 和 `helpers`
- **未覆盖**: 页面组件、API 调用、Socket 逻辑、Context 均未测试

---

## 四、TypeScript 编译状态

| 源文件 | 编译输出 | 状态 |
|--------|----------|------|
| `ChannelService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `ColumnService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `FriendService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `NotificationService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `PollService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `PostService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `TagService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `UserService.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |
| `services-registry.ts` | `.js` + `.d.ts` + `.js.map` | 正常 |

**结论**: 9/9 源文件编译完整，输出文件齐全。

---

## 五、前端代码检查

### 5.1 发现的问题

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `client/src/pages/PostDetailPage.jsx:40` | `Array(data.upvotes).fill(null)` 写法危险，若 `data.upvotes` 为数字则创建该长度数组；若为数组则行为异常 | 中 |
| `client/src/pages/PostDetailPage.jsx:27-28` | 依赖 `upvotes`/`downvotes` 数组包含用户 ID，但后端可能改为计数方式 | 低 |

### 5.2 良好实践
- `ChatArea.jsx` 正确处理 Socket 订阅/取消订阅生命周期
- `timeAgo` 工具函数覆盖完整时间粒度
- `escapeHtml` 使用 DOM API 进行 XSS 防护

---

## 六、TODO/不完整实现

**结果**: 在项目源码中（排除 `node_modules`）未发现任何 `TODO` / `FIXME` / `HACK` / `XXX` / `BUG` 标记。

---

## 七、评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| 代码整洁度 | 18/20 | 存在4处重复函数，1处未使用导入 |
| 逻辑正确性 | 16/20 | 2处逻辑缺陷（totalVotes、commentCount保存） |
| 接口一致性 | 16/20 | Schema与路由参数不匹配，Service签名与调用不匹配 |
| 测试覆盖 | 14/20 | 服务端仅1个路由测试，客户端仅UI组件测试 |
| 可维护性 | 17/20 | TS编译完整，结构清晰，但日志一致性待改进 |
| 文档/注释 | 8/10 | 无TODO，但缺少复杂逻辑注释 |
| **总分** | **89/100** | |

---

## 八、优先修复建议

1. **高优先级**:
   - 修复 `PollService.votePoll` 的 `totalVotes` 计算逻辑（重新投票时递减旧票）
   - 修复 `validation.js` 中 `votePoll` schema，将 `optionId` 改为 `optionIds` 数组
   - 修复 `FileRepository.deleteComment` 中 `post.commentCount` 递减后的保存逻辑

2. **中优先级**:
   - 统一 `PostService.voteComment` 签名与路由调用，明确是否支持踩评论
   - 修复 `PostDetailPage.jsx` 中 `Array(data.upvotes)` 的潜在问题

3. **低优先级**:
   - 提取公共 `getUser` 辅助函数到共享模块，消除4处重复
   - 统一路由层错误日志，全部使用 `logger.error`
   - 将 `TagService.getColumns` 迁移至 `ColumnService`
   - 合并 `users.js` 中重复的搜索端点
