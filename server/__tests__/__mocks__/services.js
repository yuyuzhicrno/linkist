import { jest } from '@jest/globals';

export const mockRepo = {
  data: {
    users: [],
    posts: [],
    channels: [],
    directMessages: [],
    notifications: [],
    tags: [],
    polls: []
  },
  async read() { return this; },
  async write() { return this; }
};

export function createMockRepo() {
  const repo = {
    users: null,
    userById: null,
    userByEmail: null,
    userByUsername: null,
    createUser: null,
    updateUser: null,
    posts: null,
    postById: null,
    createPost: null,
    updatePost: null,
    deletePost: null,
    channels: null,
    channelById: null,
    channelBySlug: null,
    createChannel: null,
    updateChannel: null,
    directMessages: null,
    directMessageById: null,
    createDirectMessage: null,
    updateDirectMessage: null,
    notifications: null,
    createNotification: null,
    markNotificationRead: null,
    tags: null,
    upsertTag: null,
    updateTag: null,
    polls: null,
    pollById: null,
    createPoll: null,
    updatePoll: null,
    postComments: null,
    createComment: null,
    commentUpvote: null,
    commentReplies: null,
    createReply: null,
    channelMessages: null,
    createChannelMessage: null,
    dmMessages: null,
    createDmMessage: null,
    toggleReaction: null
  };

  repo.users = jest.fn(async () => mockRepo.data.users);
  repo.userById = jest.fn(async (id) => mockRepo.data.users.find(u => u.id === id) || null);
  repo.userByEmail = jest.fn(async (email) => mockRepo.data.users.find(u => u.email === email) || null);
  repo.userByUsername = jest.fn(async (username) => mockRepo.data.users.find(u => u.username === username) || null);
  repo.createUser = jest.fn(async (user) => {
    mockRepo.data.users.push(user);
    return user;
  });
  repo.updateUser = jest.fn(async (id, updates) => {
    const idx = mockRepo.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.users[idx], updates);
    return mockRepo.data.users[idx];
  });
  repo.posts = jest.fn(async (options = {}) => ({
    posts: mockRepo.data.posts,
    total: mockRepo.data.posts.length,
    page: 1,
    limit: 20
  }));
  repo.postById = jest.fn(async (id) => mockRepo.data.posts.find(p => p.id === id) || null);
  repo.createPost = jest.fn(async (post) => {
    mockRepo.data.posts.push(post);
    return post;
  });
  repo.updatePost = jest.fn(async (id, updates) => {
    const idx = mockRepo.data.posts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.posts[idx], updates);
    return mockRepo.data.posts[idx];
  });
  repo.deletePost = jest.fn(async (id) => {
    const idx = mockRepo.data.posts.findIndex(p => p.id === id);
    if (idx === -1) return false;
    mockRepo.data.posts.splice(idx, 1);
    return true;
  });
  repo.channels = jest.fn(async () => mockRepo.data.channels);
  repo.channelById = jest.fn(async (id) => mockRepo.data.channels.find(c => c.id === id) || null);
  repo.channelBySlug = jest.fn(async (slug) => mockRepo.data.channels.find(c => c.slug === slug) || null);
  repo.createChannel = jest.fn(async (channel) => {
    mockRepo.data.channels.push(channel);
    return channel;
  });
  repo.updateChannel = jest.fn(async (id, updates) => {
    const idx = mockRepo.data.channels.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.channels[idx], updates);
    return mockRepo.data.channels[idx];
  });
  repo.directMessages = jest.fn(async () => mockRepo.data.directMessages);
  repo.directMessageById = jest.fn(async (id) => mockRepo.data.directMessages.find(d => d.id === id) || null);
  repo.createDirectMessage = jest.fn(async (dm) => {
    mockRepo.data.directMessages.push(dm);
    return dm;
  });
  repo.updateDirectMessage = jest.fn(async (id, updates) => {
    const idx = mockRepo.data.directMessages.findIndex(d => d.id === id);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.directMessages[idx], updates);
    return mockRepo.data.directMessages[idx];
  });
  repo.notifications = jest.fn(async (userId) => mockRepo.data.notifications.filter(n => n.userId === userId));
  repo.createNotification = jest.fn(async (notification) => {
    mockRepo.data.notifications.push(notification);
    return notification;
  });
  repo.markNotificationRead = jest.fn(async (id) => {
    const idx = mockRepo.data.notifications.findIndex(n => n.id === id);
    if (idx === -1) return null;
    mockRepo.data.notifications[idx].isRead = true;
    return mockRepo.data.notifications[idx];
  });
  repo.tags = jest.fn(async () => mockRepo.data.tags);
  repo.upsertTag = jest.fn(async (name, color) => {
    const existing = mockRepo.data.tags.find(t => t.name === name);
    if (existing) {
      existing.count++;
      return existing;
    }
    const tag = { name, count: 1, color };
    mockRepo.data.tags.push(tag);
    return tag;
  });
  repo.updateTag = jest.fn(async (name, updates) => {
    const idx = mockRepo.data.tags.findIndex(t => t.name === name);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.tags[idx], updates);
    return mockRepo.data.tags[idx];
  });
  repo.polls = jest.fn(async () => mockRepo.data.polls);
  repo.pollById = jest.fn(async (id) => mockRepo.data.polls.find(p => p.id === id) || null);
  repo.createPoll = jest.fn(async (poll) => {
    mockRepo.data.polls.push(poll);
    return poll;
  });
  repo.updatePoll = jest.fn(async (id, updates) => {
    const idx = mockRepo.data.polls.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(mockRepo.data.polls[idx], updates);
    return mockRepo.data.polls[idx];
  });
  repo.postComments = jest.fn(async (postId) => {
    const post = mockRepo.data.posts.find(p => p.id === postId);
    return post?.comments || [];
  });
  repo.createComment = jest.fn(async (comment) => {
    const post = mockRepo.data.posts.find(p => p.id === comment.postId);
    if (!post) return null;
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    return comment;
  });
  repo.commentUpvote = jest.fn(async (commentId, userId) => {
    for (const post of mockRepo.data.posts) {
      const comment = post.comments?.find(c => c.id === commentId);
      if (comment) {
        comment.upvotes = comment.upvotes || [];
        if (comment.upvotes.includes(userId)) {
          comment.upvotes = comment.upvotes.filter(id => id !== userId);
        } else {
          comment.upvotes.push(userId);
        }
        return comment;
      }
    }
    return null;
  });
  repo.commentReplies = jest.fn(async (commentId) => {
    for (const post of mockRepo.data.posts) {
      const comment = post.comments?.find(c => c.id === commentId);
      if (comment) return comment.replies || [];
    }
    return [];
  });
  repo.createReply = jest.fn(async (reply) => {
    for (const post of mockRepo.data.posts) {
      const comment = post.comments?.find(c => c.id === reply.commentId);
      if (comment) {
        comment.replies = comment.replies || [];
        comment.replies.push(reply);
        return reply;
      }
    }
    return null;
  });
  repo.channelMessages = jest.fn(async (channelId) => {
    const channel = mockRepo.data.channels.find(c => c.id === channelId);
    return channel?.messages || [];
  });
  repo.createChannelMessage = jest.fn(async (msg) => {
    const channel = mockRepo.data.channels.find(c => c.id === msg.channelId);
    if (!channel) return null;
    if (!channel.messages) channel.messages = [];
    channel.messages.push(msg);
    return msg;
  });
  repo.dmMessages = jest.fn(async (dmId) => {
    const dm = mockRepo.data.directMessages.find(d => d.id === dmId);
    return dm?.messages || [];
  });
  repo.createDmMessage = jest.fn(async (msg) => {
    const dm = mockRepo.data.directMessages.find(d => d.id === msg.dmId);
    if (!dm) return null;
    if (!dm.messages) dm.messages = [];
    dm.messages.push(msg);
    return msg;
  });
  repo.toggleReaction = jest.fn(async () => ({}));

  return repo;
}

export function createMockUserService() {
  return {
    getUserById: jest.fn(),
    addXp: jest.fn()
  };
}