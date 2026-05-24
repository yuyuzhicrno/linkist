// In-memory database with seed data
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ─── Level system ───────────────────────────────────────────────
// XP thresholds for each level (level = index)
export const LEVEL_THRESHOLDS = [0, 10, 30, 60, 100, 150, 220, 310, 420, 560, 730];
export const LEVEL_NAMES = [
  '新人', '初学者', '探索者', '贡献者', '活跃者',
  '达人', '专家', '传播者', '领袖', '先驱', '传奇'
];
export const LEVEL_COLORS = [
  '#94a3b8', '#64748b', '#3b82f6', '#10b981', '#f59e0b',
  '#f97316', '#ef4444', '#a855f7', '#ec4899', '#7c3aed', '#fbbf24'
];

export function calcLevel(xp) {
  let lv = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { lv = i; break; }
  }
  const nextXp = LEVEL_THRESHOLDS[lv + 1] || null;
  return { level: lv, name: LEVEL_NAMES[lv], color: LEVEL_COLORS[lv], xp, nextXp };
}

// Can create channel if level >= 3
export const CHANNEL_CREATE_LEVEL = 3;

export const db = {
  users: [
    {
      id: 'u1',
      username: 'admin',
      email: 'admin@nexus.io',
      passwordHash: bcrypt.hashSync('admin123', 10),
      avatar: null,
      bio: 'Nexus 创始人',
      role: 'admin',
      xp: 730,
      createdAt: new Date('2026-01-01').toISOString(),
      theme: 'dark',
      accentColor: '#7c3aed',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      friends: ['u2'],
      friendRequests: []
    },
    {
      id: 'u2',
      username: 'curly_dev',
      email: 'curly@nexus.io',
      passwordHash: bcrypt.hashSync('pass123', 10),
      avatar: null,
      bio: 'Curly 2.0 语言作者，Rust 爱好者',
      role: 'member',
      xp: 220,
      createdAt: new Date('2026-02-15').toISOString(),
      theme: 'dark',
      accentColor: '#06b6d4',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      friends: ['u1'],
      friendRequests: []
    }
  ],

  // ─── Private messages ──────────────────────────────────────────
  // dm[conversationId] = { participants: [uid,uid], messages: [...] }
  directMessages: [
    {
      id: 'dm1',
      participants: ['u1', 'u2'],
      messages: [
        { id: 'dmi1', senderId: 'u1', content: '你好，curly！欢迎加入 Nexus 🎉', createdAt: new Date('2026-05-24T10:00').toISOString(), read: true },
        { id: 'dmi2', senderId: 'u2', content: '谢谢！这平台做得真好', createdAt: new Date('2026-05-24T10:02').toISOString(), read: false }
      ]
    }
  ],

  // ─── Global tags registry ──────────────────────────────────────
  tags: [
    { name: 'Rust', count: 3, color: '#f97316' },
    { name: '编程', count: 2, color: '#3b82f6' },
    { name: 'async', count: 1, color: '#10b981' },
    { name: 'macOS', count: 1, color: '#6366f1' },
    { name: '公告', count: 1, color: '#7c3aed' },
    { name: '欢迎', count: 1, color: '#ec4899' },
    { name: 'dotfiles', count: 1, color: '#f59e0b' },
    { name: '工具', count: 1, color: '#14b8a6' },
    { name: '编译器', count: 2, color: '#ef4444' },
    { name: 'AST', count: 1, color: '#8b5cf6' },
    { name: 'Parser', count: 1, color: '#06b6d4' },
    { name: 'Lexer', count: 1, color: '#84cc16' }
  ],

  // ─── Polls (standalone, can be attached to posts) ─────────────
  polls: [
    {
      id: 'poll1',
      postId: 'p1',
      question: '你最喜欢哪种编程语言？',
      options: [
        { id: 'po1', text: 'Rust', votes: ['u1'] },
        { id: 'po2', text: 'Go', votes: [] },
        { id: 'po3', text: 'Python', votes: ['u2'] },
        { id: 'po4', text: 'TypeScript', votes: [] }
      ],
      allowMultiple: false,
      endsAt: null,
      createdAt: new Date('2026-01-01').toISOString(),
      authorId: 'u1'
    }
  ],

  channels: [
    {
      id: 'c1',
      name: '通用讨论',
      slug: 'general',
      description: '什么都可以聊！',
      icon: '💬',
      color: '#7c3aed',
      isPublic: true,
      memberIds: ['u1', 'u2'],
      ownerId: 'u1',
      createdAt: new Date('2026-01-01').toISOString(),
      messages: [
        { id: 'm1', authorId: 'u1', content: '欢迎来到 Nexus！', createdAt: new Date('2026-01-01T10:00').toISOString(), reactions: { '👍': ['u2'], '🎉': ['u2'] } },
        { id: 'm2', authorId: 'u2', content: '太好了！这个平台真棒 🚀', createdAt: new Date('2026-01-01T10:05').toISOString(), reactions: {} }
      ]
    },
    {
      id: 'c2',
      name: '编程技术',
      slug: 'programming',
      description: 'Rust、Curly、语言设计讨论',
      icon: '🦀',
      color: '#f97316',
      isPublic: true,
      memberIds: ['u1', 'u2'],
      ownerId: 'u1',
      createdAt: new Date('2026-01-02').toISOString(),
      messages: [
        { id: 'm3', authorId: 'u2', content: 'Curly 2.0 VM 终于跑起来了！', createdAt: new Date('2026-05-24T09:00').toISOString(), reactions: { '🔥': ['u1'] } }
      ]
    },
    {
      id: 'c3',
      name: '音乐角',
      slug: 'music',
      description: '分享你爱的音乐',
      icon: '🎵',
      color: '#ec4899',
      isPublic: true,
      memberIds: ['u1'],
      ownerId: 'u1',
      createdAt: new Date('2026-01-03').toISOString(),
      messages: []
    }
  ],

  posts: [
    {
      id: 'p1',
      title: '欢迎来到 Nexus 讨论区！',
      content: '# 欢迎！\n\nNexus 是一个融合了 Reddit、Discord 和专栏系统的下一代社区平台。\n\n- **讨论区**：像 Reddit 一样发帖、投票\n- **频道**：像 Discord 一样实时聊天\n- **专栏**：发表长文章，分享你的思考\n\n开始你的旅程吧！',
      authorId: 'u1',
      category: '公告',
      tags: ['公告', '欢迎'],
      upvotes: ['u2'],
      downvotes: [],
      views: 128,
      comments: [
        {
          id: 'cm1', authorId: 'u2', content: '太棒了！期待更多功能！',
          upvotes: ['u1'], downvotes: [],
          replies: [],
          createdAt: new Date('2026-01-01T11:00').toISOString()
        }
      ],
      createdAt: new Date('2026-01-01T09:00').toISOString(),
      isPinned: true,
      flair: '公告',
      pollId: 'poll1'
    },
    {
      id: 'p2',
      title: '聊聊 Rust 中的 async/await 最佳实践',
      content: 'Rust 的异步编程模型很有趣，但也有很多坑。\n\n## tokio vs async-std\n\n个人认为 tokio 更成熟，生态更好...\n\n## 常见错误\n\n1. Future 未 await 就丢弃\n2. 在 async 上下文中使用阻塞调用',
      authorId: 'u2',
      category: '技术',
      tags: ['Rust', 'async', '编程'],
      upvotes: ['u1'],
      downvotes: [],
      views: 56,
      comments: [],
      createdAt: new Date('2026-05-20T14:00').toISOString(),
      isPinned: false,
      flair: '技术',
      pollId: null
    },
    {
      id: 'p3',
      title: '请问大家用什么工具管理 dotfiles？',
      content: '最近想整理一下自己的 macOS 配置，想听听大家的方案。chezmoi？stow？还是手撸脚本？',
      authorId: 'u2',
      category: '提问',
      tags: ['macOS', 'dotfiles', '工具'],
      upvotes: [],
      downvotes: [],
      views: 23,
      comments: [],
      createdAt: new Date('2026-05-23T10:00').toISOString(),
      isPinned: false,
      flair: '提问',
      pollId: null
    }
  ],

  columns: [
    {
      id: 'col1',
      title: '从零实现一门编程语言',
      slug: 'build-a-language',
      description: '记录 Curly 2.0 的设计与实现过程',
      authorId: 'u2',
      coverColor: '#7c3aed',
      followers: ['u1'],
      articles: [
        {
          id: 'a1',
          title: '第一章：词法分析器（Lexer）',
          summary: '如何将源代码字符流分解为 Token 序列',
          content: '# 词法分析器\n\n词法分析是编译器前端的第一步...\n\n## Token 的定义\n\n```rust\npub enum Token {\n    Number(f64),\n    String(String),\n    Ident(String),\n    // ...\n}\n```\n\n...',
          tags: ['Rust', '编译器', 'Lexer'],
          likes: ['u1'],
          views: 312,
          createdAt: new Date('2026-03-01').toISOString(),
          readTime: 8,
          comments: []
        },
        {
          id: 'a2',
          title: '第二章：语法解析器（Parser）',
          summary: '用递归下降构建 AST',
          content: '# 语法解析器\n\n在拿到 Token 流之后，我们需要将其转化为抽象语法树（AST）...',
          tags: ['Rust', '编译器', 'Parser', 'AST'],
          likes: ['u1'],
          views: 208,
          createdAt: new Date('2026-04-01').toISOString(),
          readTime: 12,
          comments: []
        }
      ],
      createdAt: new Date('2026-02-01').toISOString()
    }
  ]
};

export const findUser = (id) => db.users.find(u => u.id === id);
export const findUserByEmail = (email) => db.users.find(u => u.email === email);
export const findUserByUsername = (username) => db.users.find(u => u.username === username);
export const safeUser = (u) => {
  if (!u) return null;
  const { passwordHash, ...safe } = u;
  return { ...safe, levelInfo: calcLevel(u.xp || 0) };
};

// Add XP and potentially increment global tag counts
export function addXp(userId, amount) {
  const user = db.users.find(u => u.id === userId);
  if (user) user.xp = (user.xp || 0) + amount;
}

// Sync tag counts from posts + column articles
export function syncTagCount(tag) {
  let count = 0;
  db.posts.forEach(p => { if (p.tags.includes(tag)) count++; });
  db.columns.forEach(col => col.articles.forEach(a => { if (a.tags.includes(tag)) count++; }));
  const existing = db.tags.find(t => t.name === tag);
  if (existing) existing.count = count;
  else db.tags.push({ name: tag, count, color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0') });
}
