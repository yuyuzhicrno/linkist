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
  users: [],

  // ─── Private messages ──────────────────────────────────────────
  // dm[conversationId] = { participants: [uid,uid], messages: [...] }
  directMessages: [],

  // ─── Global tags registry ──────────────────────────────────────
  tags: [],

  // ─── Polls (standalone, can be attached to posts) ─────────────
  polls: [],

  channels: [
    {
      id: 'c1',
      name: '通用讨论',
      slug: 'general',
      description: '什么都可以聊！',
      icon: '💬',
      color: '#7c3aed',
      isPublic: true,
      memberIds: [],
      ownerId: null,
      createdAt: new Date().toISOString(),
      messages: []
    }
  ],

  posts: [],

  columns: []
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
