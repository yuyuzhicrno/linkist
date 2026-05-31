import { jest } from '@jest/globals';

export const mockRepo = {
  data: {
    users: [],
    posts: [],
    channels: [],
    directMessages: [],
    notifications: [],
    tags: [],
    polls: [],
    post_comments: [],
    comment_replies: [],
    channel_messages: [],
    dm_messages: [],
    message_reactions: [],
    columns: [],
    column_articles: [],
    column_posts: []
  }
};

export function createMockRepo() {
  const repo = {
    users: jest.fn(async () => mockRepo.data.users),
    userById: jest.fn(async (id) => mockRepo.data.users.find(u => u.id === id) || null),
    userByEmail: jest.fn(async (email) => mockRepo.data.users.find(u => u.email === email) || null),
    userByUsername: jest.fn(async (username) => mockRepo.data.users.find(u => u.username === username) || null),
    createUser: jest.fn(async (user) => {
      mockRepo.data.users.push(user);
      return user;
    }),
    updateUser: jest.fn(async (id, updates) => {
      const idx = mockRepo.data.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.users[idx], updates);
      return mockRepo.data.users[idx];
    }),
    posts: jest.fn(async (options = {}) => {
      const { page = 1, limit = 20 } = options;
      const start = (page - 1) * limit;
      return {
        posts: mockRepo.data.posts.slice(start, start + limit),
        total: mockRepo.data.posts.length,
        page,
        limit
      };
    }),
    postById: jest.fn(async (id) => mockRepo.data.posts.find(p => p.id === id) || null),
    createPost: jest.fn(async (post) => {
      mockRepo.data.posts.push(post);
      return post;
    }),
    updatePost: jest.fn(async (id, updates) => {
      const idx = mockRepo.data.posts.findIndex(p => p.id === id);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.posts[idx], updates);
      return mockRepo.data.posts[idx];
    }),
    deletePost: jest.fn(async (id) => {
      const idx = mockRepo.data.posts.findIndex(p => p.id === id);
      if (idx === -1) return false;
      mockRepo.data.posts.splice(idx, 1);
      return true;
    }),
    channels: jest.fn(async (options = {}) => mockRepo.data.channels),
    channelById: jest.fn(async (id) => mockRepo.data.channels.find(c => c.id === id) || null),
    channelBySlug: jest.fn(async (slug) => mockRepo.data.channels.find(c => c.slug === slug) || null),
    createChannel: jest.fn(async (channel) => {
      mockRepo.data.channels.push(channel);
      return channel;
    }),
    updateChannel: jest.fn(async (id, updates) => {
      const idx = mockRepo.data.channels.findIndex(c => c.id === id);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.channels[idx], updates);
      return mockRepo.data.channels[idx];
    }),
    deleteChannel: jest.fn(async (id) => {
      const idx = mockRepo.data.channels.findIndex(c => c.id === id);
      if (idx === -1) return false;
      mockRepo.data.channels.splice(idx, 1);
      return true;
    }),
    directMessages: jest.fn(async (participants) => {
      if (!participants) {
        return mockRepo.data.directMessages;
      }
      return mockRepo.data.directMessages.filter(dm => 
        dm.participants?.length === participants.length &&
        participants.every(p => dm.participants?.includes(p))
      );
    }),
    directMessageById: jest.fn(async (id) => mockRepo.data.directMessages.find(dm => dm.id === id) || null),
    createDirectMessage: jest.fn(async (dm) => {
      mockRepo.data.directMessages.push(dm);
      return dm;
    }),
    updateDirectMessage: jest.fn(async (id, updates) => {
      const idx = mockRepo.data.directMessages.findIndex(dm => dm.id === id);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.directMessages[idx], updates);
      return mockRepo.data.directMessages[idx];
    }),
    deleteDirectMessage: jest.fn(async (id) => {
      const idx = mockRepo.data.directMessages.findIndex(dm => dm.id === id);
      if (idx === -1) return false;
      mockRepo.data.directMessages.splice(idx, 1);
      return true;
    }),
    notifications: jest.fn(async (userId, options = {}) => {
      const { page = 1, limit = 20 } = options;
      const start = (page - 1) * limit;
      return mockRepo.data.notifications.filter(n => n.userId === userId).slice(start, start + limit);
    }),
    createNotification: jest.fn(async (notification) => {
      mockRepo.data.notifications.push(notification);
      return notification;
    }),
    markNotificationRead: jest.fn(async (id) => {
      const idx = mockRepo.data.notifications.findIndex(n => n.id === id);
      if (idx === -1) return null;
      mockRepo.data.notifications[idx].isRead = true;
      return mockRepo.data.notifications[idx];
    }),
    markAllNotificationsRead: jest.fn(async (userId) => {
      mockRepo.data.notifications.forEach(n => {
        if (n.userId === userId) n.isRead = true;
      });
    }),
    tags: jest.fn(async () => mockRepo.data.tags),
    upsertTag: jest.fn(async (name, color) => {
      const existing = mockRepo.data.tags.find(t => t.name === name);
      if (existing) {
        existing.count = (existing.count || 0) + 1;
        if (color) existing.color = color;
        return existing;
      }
      const newTag = { name, count: 1, color: color || '#7c3aed' };
      mockRepo.data.tags.push(newTag);
      return newTag;
    }),
    updateTag: jest.fn(async (name, updates) => {
      const idx = mockRepo.data.tags.findIndex(t => t.name === name);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.tags[idx], updates);
      return mockRepo.data.tags[idx];
    }),
    polls: jest.fn(async () => mockRepo.data.polls),
    pollById: jest.fn(async (id) => mockRepo.data.polls.find(p => p.id === id) || null),
    createPoll: jest.fn(async (poll) => {
      mockRepo.data.polls.push(poll);
      return poll;
    }),
    updatePoll: jest.fn(async (id, updates) => {
      const idx = mockRepo.data.polls.findIndex(p => p.id === id);
      if (idx === -1) return null;
      Object.assign(mockRepo.data.polls[idx], updates);
      return mockRepo.data.polls[idx];
    }),
    deletePoll: jest.fn(async (id) => {
      const idx = mockRepo.data.polls.findIndex(p => p.id === id);
      if (idx === -1) return false;
      mockRepo.data.polls.splice(idx, 1);
      return true;
    }),
    commentById: jest.fn(async (id) => mockRepo.data.post_comments.find(c => c.id === id) || null),
    postComments: jest.fn(async (postId) => 
      mockRepo.data.post_comments.filter(c => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    ),
    createComment: jest.fn(async (comment) => {
      mockRepo.data.post_comments.push(comment);
      return comment;
    }),
    commentUpvote: jest.fn(async (commentId, userId) => {
      const comment = mockRepo.data.post_comments.find(c => c.id === commentId);
      if (!comment) return null;
      comment.upvotes = comment.upvotes || [];
      if (comment.upvotes.includes(userId)) {
        comment.upvotes = comment.upvotes.filter(id => id !== userId);
      } else {
        comment.upvotes.push(userId);
      }
      return comment;
    }),
    commentReplies: jest.fn(async (commentId) => 
      mockRepo.data.comment_replies.filter(r => r.commentId === commentId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    ),
    createReply: jest.fn(async (reply) => {
      mockRepo.data.comment_replies.push(reply);
      return reply;
    }),
    channelMessages: jest.fn(async (channelId, options = {}) => {
      const { limit = 50, offset = 0 } = options;
      return mockRepo.data.channel_messages.filter(m => m.channelId === channelId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);
    }),
    createChannelMessage: jest.fn(async (msg) => {
      mockRepo.data.channel_messages.push(msg);
      return msg;
    }),
    dmMessages: jest.fn(async (dmId, options = {}) => {
      const { limit = 50, offset = 0 } = options;
      return mockRepo.data.dm_messages.filter(m => m.dmId === dmId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);
    }),
    createDmMessage: jest.fn(async (msg) => {
      mockRepo.data.dm_messages.push(msg);
      return msg;
    }),
    messageReactions: jest.fn(async (messageId, messageType) => {
      const reactions = {};
      const messageReactions = mockRepo.data.message_reactions.filter(
        r => r.messageId === messageId && r.messageType === messageType
      );
      for (const reaction of messageReactions) {
        if (!reactions[reaction.emoji]) {
          reactions[reaction.emoji] = [];
        }
        reactions[reaction.emoji].push(reaction.userId);
      }
      return Object.entries(reactions).map(([emoji, userIds]) => ({ emoji, userIds }));
    }),
    toggleReaction: jest.fn(async (messageId, messageType, emoji, userId) => {
      const existingIdx = mockRepo.data.message_reactions.findIndex(
        r => r.messageId === messageId && r.messageType === messageType && r.emoji === emoji && r.userId === userId
      );
      if (existingIdx !== -1) {
        mockRepo.data.message_reactions.splice(existingIdx, 1);
      } else {
        mockRepo.data.message_reactions.push({
          id: crypto.randomUUID(),
          messageId,
          messageType,
          emoji,
          userId,
          createdAt: new Date().toISOString()
        });
      }
      return mockRepo.messageReactions(messageId, messageType);
    }),
    columns: jest.fn(async (options = {}) => {
      const { page = 1, limit = 20 } = options;
      const start = (page - 1) * limit;
      return {
        columns: mockRepo.data.columns.slice(start, start + limit),
        total: mockRepo.data.columns.length,
        page,
        limit
      };
    }),
    columnById: jest.fn(async (id) => mockRepo.data.columns.find(c => c.id === id) || null),
    columnBySlug: jest.fn(async (slug) => mockRepo.data.columns.find(c => c.slug === slug) || null),
    createColumn: jest.fn(async (column) => {
      mockRepo.data.columns.push(column);
      return column;
    }),
    columnPosts: jest.fn(async (columnId, options = {}) => {
      const { limit = 50, offset = 0 } = options;
      const postIds = mockRepo.data.column_posts
        .filter(cp => cp.columnId === columnId)
        .map(cp => cp.postId);
      return postIds.map(id => mockRepo.data.posts.find(p => p.id === id)).filter(Boolean);
    }),
    addColumnArticle: jest.fn(async (columnId, article) => {
      const column = mockRepo.data.columns.find(c => c.id === columnId);
      if (!column) return null;
      mockRepo.data.column_articles.push(article);
      return article;
    }),
    getColumnArticle: jest.fn(async (columnId, articleId) => {
      const article = mockRepo.data.column_articles.find(
        a => a.id === articleId && a.columnId === columnId
      );
      return article || null;
    }),
    toggleColumnArticleLike: jest.fn(async (columnId, articleId, userId) => {
      const article = mockRepo.data.column_articles.find(
        a => a.id === articleId && a.columnId === columnId
      );
      if (!article) return null;
      article.likes = article.likes || [];
      const likeIdx = article.likes.indexOf(userId);
      if (likeIdx === -1) {
        article.likes.push(userId);
      } else {
        article.likes.splice(likeIdx, 1);
      }
      return article;
    }),
    toggleColumnFollow: jest.fn(async (columnId, userId) => {
      const column = mockRepo.data.columns.find(c => c.id === columnId);
      if (!column) return null;
      column.followers = column.followers || [];
      const idx = column.followers.indexOf(userId);
      if (idx === -1) {
        column.followers.push(userId);
      } else {
        column.followers.splice(idx, 1);
      }
      return { followed: idx === -1, followers: column.followers };
    })
  };

  return repo;
}

export function createMockUserService() {
  return {
    addXp: jest.fn(async (userId, amount) => ({ success: true })),
    getUserLevel: jest.fn(async (userId) => 1),
    getUserStats: jest.fn(async (userId) => ({ xp: 100, level: 1 }))
  };
}