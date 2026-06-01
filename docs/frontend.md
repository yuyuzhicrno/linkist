# 前端架构文档

---

## 目录

- [1. 前端架构概述](#1-前端架构概述)
- [2. 项目结构](#2-项目结构)
- [3. 组件设计](#3-组件设计)
- [4. 状态管理](#4-状态管理)
- [5. API 封装](#5-api-封装)
- [6. 主题系统](#6-主题系统)
- [7. 路由设计](#7-路由设计)
- [8. WebSocket 集成](#8-websocket-集成)

---

## 1. 前端架构概述

### 架构风格

采用 **React 组件化架构**，结合以下设计模式：

1. **组件分层**：UI 组件、业务组件、页面组件
2. **状态管理**：React Context + useReducer
3. **数据获取**：自定义 hooks + API 封装
4. **样式方案**：Tailwind CSS + CSS 变量

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| React Router | 6 | 路由管理 |
| Vite | 5 | 构建工具 |
| Tailwind CSS | 3 | 样式框架 |
| Framer Motion | - | 动画库 |
| Socket.IO Client | 4 | WebSocket 客户端 |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器层                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    main.jsx                                 │
│         (应用入口，全局配置)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     App.jsx                                 │
│         (路由配置，全局布局)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Pages      │ │  Components  │ │   Contexts   │
    │ (页面组件)   │ │  (业务组件)   │ │  (状态管理)  │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
            ┌─────────────────────────────────────┐
            │              Utils                  │
            │  (API封装 / 工具函数 / 自定义hooks) │
            └─────────────────────────────────────┘
                            │
                            ▼
            ┌─────────────────────────────────────┐
            │           Services                  │
            │      (Socket.IO / 全局服务)         │
            └─────────────────────────────────────┘
```

---

## 2. 项目结构

```
client/src/
├── components/              # 组件库
│   ├── ui/                 # UI 基础组件
│   │   ├── Avatar.jsx      # 头像组件
│   │   ├── Button.jsx      # 按钮组件
│   │   ├── Card.jsx        # 卡片组件
│   │   ├── Input.jsx       # 输入框组件
│   │   ├── PollWidget.jsx  # 投票组件
│   │   └── LevelBadge.jsx  # 等级徽章
│   ├── channels/           # 频道相关组件
│   │   ├── ChannelSidebar.jsx
│   │   ├── ChatArea.jsx
│   │   ├── MessageItem.jsx
│   │   └── ChannelMembers.jsx
│   ├── columns/            # 专栏相关组件
│   │   ├── ColumnCard.jsx
│   │   ├── ColumnDetail.jsx
│   │   └── ArticleDetail.jsx
│   ├── friends/            # 好友相关组件
│   │   ├── FriendsPanel.jsx
│   │   ├── DMList.jsx
│   │   └── ChatWindow.jsx
│   └── layout/             # 布局组件
│       ├── AppLayout.jsx
│       ├── Topbar.jsx
│       └── MobileNav.jsx
├── contexts/               # React Context
│   ├── AuthContext.jsx     # 认证状态
│   └── ThemeContext.jsx    # 主题状态
├── pages/                  # 页面组件
│   ├── HomePage.jsx        # 首页
│   ├── ForumPage.jsx       # 讨论区
│   ├── ChannelsPage.jsx    # 频道页
│   ├── ColumnsPage.jsx     # 专栏页
│   ├── FriendsPage.jsx     # 好友页
│   ├── PostDetailPage.jsx  # 帖子详情
│   ├── NewPostPage.jsx     # 发帖页
│   ├── UserProfilePage.jsx # 用户主页
│   ├── SettingsPage.jsx    # 设置页
│   ├── TagsPage.jsx        # 标签页
│   └── AuthPages.jsx       # 认证页
├── services/               # 服务层
│   └── socket.js           # Socket.IO 服务
├── store/                  # 状态管理
│   └── index.js            # 全局状态
├── styles/                 # 样式文件
│   └── globals.css         # 全局样式和主题变量
├── utils/                  # 工具函数
│   ├── api.js              # API 封装
│   └── helpers.js          # 辅助函数
├── App.jsx                 # 根组件
├── main.jsx                # 入口文件
└── setupTests.js           # 测试配置
```

---

## 3. 组件设计

### 组件分类

| 类型 | 职责 | 示例 |
|------|------|------|
| **UI 组件** | 通用基础组件，无业务逻辑 | Button, Input, Card |
| **业务组件** | 特定业务功能组件 | ChatArea, PollWidget |
| **页面组件** | 页面级组件，组合业务组件 | ForumPage, ChannelsPage |
| **布局组件** | 页面布局结构 | AppLayout, Topbar |

### UI 组件设计原则

1. **可复用性**：组件应独立于业务逻辑
2. **可配置性**：通过 props 灵活配置
3. **一致性**：遵循统一的设计规范

### 组件示例：Button

```jsx
// components/ui/Button.jsx
import { cn } from '../../utils/helpers';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 focus:ring-[var(--accent)]',
    secondary: 'bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] focus:ring-[var(--accent)]',
    outline: 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] focus:ring-[var(--accent)]',
    ghost: 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      disabled={disabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## 4. 状态管理

### Context 架构

```typescript
// contexts/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        loading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // 自动登录
  useEffect(() => {
    if (state.token && !state.user) {
      api.get('/auth/me')
        .then(user => dispatch({ type: 'SET_USER', payload: user }))
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: data });
    return data.user;
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };
  
  const updateUser = (user) => {
    dispatch({ type: 'SET_USER', payload: user });
  };
  
  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## 5. API 封装

### API 工具类

```javascript
// utils/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  async get(path, options = {}) {
    return await request('GET', path, null, options);
  },
  
  async post(path, data = {}, options = {}) {
    return await request('POST', path, data, options);
  },
  
  async put(path, data = {}, options = {}) {
    return await request('PUT', path, data, options);
  },
  
  async delete(path, options = {}) {
    return await request('DELETE', path, null, options);
  },
  
  async upload(path, formData, options = {}) {
    return await request('POST', path, formData, {
      ...options,
      contentType: 'multipart/form-data'
    });
  }
};

async function request(method, path, data = null, options = {}) {
  const url = `${BASE_URL}${path}`;
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers
  };
  
  // 设置认证头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 设置 Content-Type
  if (options.contentType === 'multipart/form-data') {
    // 不设置 Content-Type，让浏览器自动设置
  } else if (data && typeof data === 'object') {
    headers['Content-Type'] = 'application/json';
    data = JSON.stringify(data);
  }
  
  const config = {
    method,
    headers,
    body: data
  };
  
  const response = await fetch(url, config);
  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(responseData.error || `Request failed with status ${response.status}`);
  }
  
  return responseData.data || responseData;
}
```

### API 方法封装

```javascript
// utils/api.js (续)
export const api = {
  // ... 基础方法
  
  // 认证相关
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  
  // 帖子相关
  getPosts: (query) => api.get('/posts', { params: query }),
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  votePost: (id, vote) => api.post(`/posts/${id}/vote`, { vote }),
  createComment: (postId, content) => api.post(`/posts/${postId}/comments`, { content }),
  
  // 频道相关
  getChannels: () => api.get('/channels'),
  getChannel: (id) => api.get(`/channels/${id}`),
  createChannel: (data) => api.post('/channels', data),
  joinChannel: (id) => api.post(`/channels/${id}/join`),
  sendMessage: (channelId, content) => api.post(`/channels/${channelId}/messages`, { content }),
  addReaction: (channelId, msgId, emoji) => api.post(`/channels/${channelId}/messages/${msgId}/react`, { emoji }),
  markChannelRead: (channelId, messageId) => api.post(`/channels/${channelId}/read`, { messageId }),
  
  // 用户相关
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (data) => api.put('/users/me', data),
  uploadAvatar: (formData) => api.upload('/users/me/avatar', formData),
  
  // 好友相关
  getFriends: () => api.get('/friends'),
  sendFriendRequest: (targetId) => api.post(`/friends/request/${targetId}`),
  acceptFriendRequest: (requesterId) => api.post(`/friends/accept/${requesterId}`),
  removeFriend: (otherId) => api.delete(`/friends/remove/${otherId}`),
  getDMs: (userId) => api.get(`/friends/dms/${userId}`),
  sendDM: (userId, content) => api.post(`/friends/dms/${userId}`, { content }),
  
  // 专栏相关
  getColumns: () => api.get('/columns'),
  getColumn: (id) => api.get(`/columns/${id}`),
  createColumn: (data) => api.post('/columns', data),
  createArticle: (columnId, data) => api.post(`/columns/${columnId}/articles`, data),
  likeArticle: (columnId, articleId) => api.post(`/columns/${columnId}/articles/${articleId}/like`),
  followColumn: (id) => api.post(`/columns/${id}/follow`),
  
  // 投票相关
  getPoll: (postId) => api.get(`/polls/post/${postId}`),
  createPoll: (data) => api.post('/polls', data),
  votePoll: (id, optionIds) => api.post(`/polls/${id}/vote`, { optionIds }),
  
  // 通知相关
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id) => api.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  
  // 标签相关
  searchTags: (query) => api.get('/tags', { params: { q: query } }),
  getTagContent: (tag) => api.get(`/tags/${tag}/content`),
  
  // 讨论区相关
  getStats: () => api.get('/discussion/stats'),
  getCategories: () => api.get('/discussion/categories')
};
```

---

## 6. 主题系统

### CSS 变量设计

```css
/* styles/globals.css */
:root {
  /* 颜色系统 */
  --accent: #8b5cf6;
  --accent-hover: #7c3aed;
  
  /* 浅色模式 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  
  --surface-1: #f8fafc;
  --surface-2: #f1f5f9;
  --surface-3: #e2e8f0;
  
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  
  /* 深色模式 */
  --dark-bg-primary: #0f172a;
  --dark-bg-secondary: #1e293b;
  --dark-bg-tertiary: #334155;
  
  --dark-text-primary: #f8fafc;
  --dark-text-secondary: #cbd5e1;
  --dark-text-muted: #64748b;
  
  --dark-surface-1: #1e293b;
  --dark-surface-2: #334155;
  --dark-surface-3: #475569;
  
  --dark-border: #334155;
  --dark-border-light: #475569;
}

/* 深色模式切换 */
.dark {
  --bg-primary: var(--dark-bg-primary);
  --bg-secondary: var(--dark-bg-secondary);
  --bg-tertiary: var(--dark-bg-tertiary);
  
  --text-primary: var(--dark-text-primary);
  --text-secondary: var(--dark-text-secondary);
  --text-muted: var(--dark-text-muted);
  
  --surface-1: var(--dark-surface-1);
  --surface-2: var(--dark-surface-2);
  --surface-3: var(--dark-surface-3);
  
  --border: var(--dark-border);
  --border-light: var(--dark-border-light);
}

/* 主题色变量 */
[data-theme="violet"] { --accent: #8b5cf6; }
[data-theme="cyan"] { --accent: #06b6d4; }
[data-theme="coral"] { --accent: #f97316; }
[data-theme="emerald"] { --accent: #10b981; }
[data-theme="amber"] { --accent: #f59e0b; }
[data-theme="rose"] { --accent: #f43f5e; }
[data-theme="lime"] { --accent: #84cc16; }
[data-theme="orange"] { --accent: #ea580c; }

/* 字号变量 */
[data-font-size="small"] { font-size: 0.875rem; }
[data-font-size="medium"] { font-size: 1rem; }
[data-font-size="large"] { font-size: 1.125rem; }
```

### ThemeContext 实现

```jsx
// contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const defaultTheme = {
  mode: 'dark',
  accentColor: 'violet',
  fontSize: 'medium'
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : defaultTheme;
  });
  
  useEffect(() => {
    localStorage.setItem('theme', JSON.stringify(theme));
    
    // 更新 DOM 属性
    document.documentElement.classList.toggle('dark', theme.mode === 'dark');
    document.documentElement.setAttribute('data-theme', theme.accentColor);
    document.documentElement.setAttribute('data-font-size', theme.fontSize);
  }, [theme]);
  
  const updateTheme = (updates) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };
  
  const toggleMode = () => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  };
  
  return (
    <ThemeContext.Provider value={{
      theme,
      updateTheme,
      toggleMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## 7. 路由设计

### 路由配置

```jsx
// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

// 页面组件
import { AuthPages } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { ForumPage } from './pages/ForumPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { ColumnsPage } from './pages/ColumnsPage';
import { FriendsPage } from './pages/FriendsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { NewPostPage } from './pages/NewPostPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TagsPage } from './pages/TagsPage';

function AppContent() {
  const { loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  return (
    <Routes>
      {/* 认证页面 */}
      <Route path="/auth/*" element={<AuthPages />} />
      
      {/* 首页 */}
      <Route path="/" element={<HomePage />} />
      
      {/* 讨论区 */}
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/forum/post/:id" element={<PostDetailPage />} />
      <Route path="/forum/new" element={<ProtectedRoute><NewPostPage /></ProtectedRoute>} />
      
      {/* 频道 */}
      <Route path="/channels" element={<ChannelsPage />} />
      <Route path="/channels/:id" element={<ChannelsPage />} />
      
      {/* 专栏 */}
      <Route path="/columns" element={<ColumnsPage />} />
      <Route path="/columns/:id" element={<ColumnsPage />} />
      
      {/* 好友 */}
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      
      {/* 用户 */}
      <Route path="/users/:id" element={<UserProfilePage />} />
      
      {/* 设置 */}
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* 标签 */}
      <Route path="/tags" element={<TagsPage />} />
      <Route path="/tags/:tag" element={<TagsPage />} />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

### 保护路由组件

```jsx
// components/ui/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth/login" />;
  }
  
  return children;
}
```

---

## 8. WebSocket 集成

### Socket 服务

```javascript
// services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;
let listeners = [];

export function initSocket(token) {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // 服务器主动断开，需要重新连接
      socket.connect();
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}

export function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
    listeners.push({ event, callback });
  }
}

export function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
    listeners = listeners.filter(l => !(l.event === event && l.callback === callback));
  }
}

export function emit(event, data) {
  if (socket) {
    socket.emit(event, data);
  }
}

// 常用事件封装
export const socketEvents = {
  // 频道消息
  onChannelMessage: (callback) => on('channel:message', callback),
  onChannelReaction: (callback) => on('channel:reaction', callback),
  
  // 私信
  onDirectMessage: (callback) => on('dm:message', callback),
  
  // 通知
  onNotification: (callback) => on('notification:new', callback),
  
  // 投票
  onPollVote: (callback) => on('poll:vote', callback),
  
  // 发送消息
  sendChannelMessage: (data) => emit('channel:send', data),
  sendDirectMessage: (data) => emit('dm:send', data),
  
  // 加入频道
  joinChannel: (channelId) => emit('channel:join', { channelId }),
  
  // 离开频道
  leaveChannel: (channelId) => emit('channel:leave', { channelId })
};
```

### 组件中使用 Socket

```jsx
// components/channels/ChatArea.jsx
import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketEvents, initSocket } from '../../services/socket';
import { api } from '../../utils/api';
import { MessageItem } from './MessageItem';

export function ChatArea({ channel, messages, setMessages }) {
  const { user, token } = useAuth();
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    // 初始化 socket
    if (token && !socket) {
      initSocket(token);
    }
    
    // 监听频道消息
    const handleMessage = (msg) => {
      if (msg.channelId === channel.id) {
        setMessages(prev => [...prev, msg]);
        
        // 标记已读
        if (msg.authorId !== user?.id) {
          api.markChannelRead(channel.id, msg.id).catch(() => {});
        }
      }
    };
    
    socketEvents.onChannelMessage(handleMessage);
    
    return () => {
      socketEvents.offChannelMessage(handleMessage);
    };
  }, [channel.id, user?.id, token]);
  
  useEffect(() => {
    // 滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (content) => {
    const msg = await api.sendMessage(channel.id, content);
    setMessages(prev => [...prev, msg]);
    api.markChannelRead(channel.id, msg.id).catch(() => {});
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入框 */}
      <div className="p-4 border-t border-[var(--border)]">
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}
```