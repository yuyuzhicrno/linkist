import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  channels: [],
  posts: [],
  notifications: [],
  unreadCount: 0,

  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set(state => ({
    channels: [...state.channels, channel]
  })),
  updateChannel: (id, updates) => set(state => ({
    channels: state.channels.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  setPosts: (posts) => set({ posts }),
  addPost: (post) => set(state => ({
    posts: [post, ...state.posts]
  })),
  updatePost: (id, updates) => set(state => ({
    posts: state.posts.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  removePost: (id) => set(state => ({
    posts: state.posts.filter(p => p.id !== id)
  })),

  addNotification: (notification) => set(state => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  markAsRead: () => set({ unreadCount: 0 }),

  reset: () => set({
    channels: [],
    posts: [],
    notifications: [],
    unreadCount: 0
  })
}));

export const useSocketStore = create((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected })
}));