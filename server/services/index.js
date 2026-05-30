import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(repo) {
    this.repo = repo;
  }

  async createUser({ username, email, password, bio = '' }) {
    const existingEmail = await this.repo.userByEmail(email);
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }

    const existingUsername = await this.repo.userByUsername(username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      avatar: null,
      bio,
      role: 'member',
      xp: 0,
      theme: 'dark',
      accentColor: '#7c3aed',
      uiSettings: { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
      isVerified: true
    };

    await this.repo.createUser(user);

    const general = await this.repo.channelBySlug('general');
    if (general) {
      const memberIds = [...(general.memberIds || []), user.id];
      await this.repo.updateChannel(general.id, { memberIds });
    }

    return user;
  }

  async verifyPassword(email, password) {
    const user = await this.repo.userByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async getUserById(id) {
    return await this.repo.userById(id);
  }

  async getUserByEmail(email) {
    return await this.repo.userByEmail(email);
  }

  async getUserByUsername(username) {
    return await this.repo.userByUsername(username);
  }

  async updateUser(id, updates) {
    if (updates.username) {
      const existing = await this.repo.userByUsername(updates.username);
      if (existing && existing.id !== id) {
        throw new Error('该用户名已被使用');
      }
    }

    return await this.repo.updateUser(id, updates);
  }

  async addXp(userId, amount) {
    const user = await this.repo.userById(userId);
    if (user) {
      await this.repo.updateUser(userId, { xp: (user.xp || 0) + amount });
    }
  }

  async getAllUsers(options = {}) {
    return await this.repo.users();
  }
}

export function calcLevel(xp) {
  if (xp < 100) return { level: 1, xp, nextLevelXp: 100 };
  if (xp < 300) return { level: 2, xp: xp - 100, nextLevelXp: 200 };
  if (xp < 600) return { level: 3, xp: xp - 300, nextLevelXp: 300 };
  if (xp < 1000) return { level: 4, xp: xp - 600, nextLevelXp: 400 };
  if (xp < 1500) return { level: 5, xp: xp - 1000, nextLevelXp: 500 };
  const level = Math.floor((Math.sqrt(2 * xp / 100) + 1));
  const needed = level > 5 ? 400 + (level - 4) * 100 : [100, 200, 300, 400, 500][Math.min(level - 1, 4)];
  return { level, xp: xp - (level > 5 ? 1000 + (level - 5) * 400 + (level - 5) * (level - 6) * 100 : 0), nextLevelXp: needed };
}

export class PostService {
  constructor(repo, userService) {
    this.repo = repo;
    this.userService = userService;
  }

  async createPost({ title, content, authorId, category = '综合', tags = [], flair = '', channelId = null }) {
    const post = {
      id: uuidv4(),
      title,
      content,
      authorId,
      category,
      tags,
      flair,
      channelId,
      isPinned: false
    };

    const created = await this.repo.createPost(post);

    for (const tag of tags) {
      await this.repo.upsertTag(tag, '#7c3aed');
    }

    return created;
  }

  async getPosts(options = {}) {
    return await this.repo.posts(options);
  }

  async getPostById(id) {
    return await this.repo.postById(id);
  }

  async updatePost(id, updates) {
    return await this.repo.updatePost(id, updates);
  }

  async deletePost(id) {
    return await this.repo.deletePost(id);
  }

  async vote(postId, userId, voteType) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    let upvotes = post.upvotes || [];
    let downvotes = post.downvotes || [];

    if (voteType === 'up') {
      if (upvotes.includes(userId)) {
        upvotes = upvotes.filter(id => id !== userId);
      } else {
        upvotes.push(userId);
        downvotes = downvotes.filter(id => id !== userId);
        await this.userService.addXp(post.authorId, 10);
      }
    } else if (voteType === 'down') {
      if (downvotes.includes(userId)) {
        downvotes = downvotes.filter(id => id !== userId);
      } else {
        downvotes.push(userId);
        upvotes = upvotes.filter(id => id !== userId);
      }
    }

    return await this.repo.updatePost(postId, { upvotes, downvotes });
  }

  async addView(postId) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');
    return await this.repo.updatePost(postId, { views: (post.views || 0) + 1 });
  }

  async addComment(postId, authorId, content) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    const comment = await this.repo.createComment({
      id: uuidv4(),
      postId,
      authorId,
      content
    });

    await this.userService.addXp(post.authorId, 5);

    return comment;
  }

  async getComments(postId) {
    const comments = await this.repo.postComments(postId);
    for (const comment of comments) {
      comment.replies = await this.repo.commentReplies(comment.id);
    }
    return comments;
  }

  async addReply(commentId, authorId, content) {
    const reply = await this.repo.createReply({
      id: uuidv4(),
      commentId,
      authorId,
      content
    });
    return reply;
  }

  async voteComment(commentId, userId, voteType) {
    return await this.repo.commentUpvote(commentId, userId);
  }

  async pinPost(postId, userId) {
    const post = await this.repo.postById(postId);
    if (!post) throw new Error('帖子不存在');

    if (post.authorId !== userId) {
      const user = await this.repo.userById(userId);
      if (!user || user.role !== 'admin') {
        throw new Error('没有权限置顶帖子');
      }
    }

    return await this.repo.updatePost(postId, { isPinned: !post.isPinned });
  }
}

export class ChannelService {
  constructor(repo) {
    this.repo = repo;
  }

  async createChannel({ name, description = '', icon = '💬', color = '#7c3aed', isPublic = true, ownerId }) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const existing = await this.repo.channelBySlug(slug);
    if (existing) {
      throw new Error('该频道名称已存在');
    }

    const channel = {
      id: uuidv4(),
      name,
      slug,
      description,
      icon,
      color,
      isPublic,
      ownerId,
      memberIds: [ownerId]
    };

    return await this.repo.createChannel(channel);
  }

  async getChannels(options = {}) {
    return await this.repo.channels(options);
  }

  async getChannelById(id) {
    return await this.repo.channelById(id);
  }

  async getChannelBySlug(slug) {
    return await this.repo.channelBySlug(slug);
  }

  async updateChannel(id, updates) {
    return await this.repo.updateChannel(id, updates);
  }

  async joinChannel(channelId, userId) {
    const channel = await this.repo.channelById(channelId);
    if (!channel) throw new Error('频道不存在');

    if (!channel.isPublic) {
      throw new Error('无法加入私密频道');
    }

    const memberIds = [...(channel.memberIds || [])];
    if (!memberIds.includes(userId)) {
      memberIds.push(userId);
      await this.repo.updateChannel(channelId, { memberIds });
    }

    return channel;
  }

  async sendMessage(channelId, { content, authorId }) {
    const channel = await this.repo.channelById(channelId);
    if (!channel) throw new Error('频道不存在');

    if (!channel.isPublic && !channel.memberIds?.includes(authorId)) {
      throw new Error('您不是该频道成员');
    }

    const msg = await this.repo.createChannelMessage({
      id: uuidv4(),
      channelId,
      authorId,
      content
    });

    return msg;
  }

  async getChannelMessages(channelId, options = {}) {
    return await this.repo.channelMessages(channelId, options);
  }

  async addReaction(channelId, messageId, emoji, userId) {
    return await this.repo.toggleReaction(messageId, 'channel', emoji, userId);
  }
}

export class FriendService {
  constructor(repo) {
    this.repo = repo;
  }

  async sendFriendRequest(fromId, toId) {
    if (fromId === toId) {
      throw new Error('不能向自己发送好友请求');
    }

    const toUser = await this.repo.userById(toId);
    if (!toUser) throw new Error('用户不存在');

    const fromUser = await this.repo.userById(fromId);
    if (!fromUser) throw new Error('发送者不存在');

    const requests = [...(toUser.friendRequests || [])];
    if (requests.includes(fromId)) {
      throw new Error('好友请求已发送');
    }

    await this.repo.updateUser(toId, { friendRequests: [...requests, fromId] });

    await this.repo.createNotification({
      id: uuidv4(),
      userId: toId,
      type: 'friend_request',
      title: '新的好友请求',
      message: `${fromUser.username} 请求添加您为好友`,
      data: { userId: fromId }
    });

    return true;
  }

  async acceptFriendRequest(userId, requesterId) {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const requests = [...(user.friendRequests || [])];
    if (!requests.includes(requesterId)) {
      throw new Error('好友请求不存在');
    }

    const updatedRequests = requests.filter(id => id !== requesterId);
    const friends = [...(user.friends || []), requesterId];
    await this.repo.updateUser(userId, { friendRequests: updatedRequests, friends });

    const requester = await this.repo.userById(requesterId);
    if (requester) {
      const requesterFriends = [...(requester.friends || []), userId];
      await this.repo.updateUser(requesterId, { friends: requesterFriends });

      await this.repo.createNotification({
        id: uuidv4(),
        userId: requesterId,
        type: 'friend_accepted',
        title: '好友请求已通过',
        message: `${user.username} 接受了您的好友请求`,
        data: { userId }
      });
    }

    return true;
  }

  async rejectFriendRequest(userId, requesterId) {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const requests = [...(user.friendRequests || [])];
    const updatedRequests = requests.filter(id => id !== requesterId);
    await this.repo.updateUser(userId, { friendRequests: updatedRequests });

    return true;
  }

  async removeFriend(userId, friendId) {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const friends = [...(user.friends || [])];
    if (!friends.includes(friendId)) {
      throw new Error('不是好友关系');
    }

    const updatedFriends = friends.filter(id => id !== friendId);
    await this.repo.updateUser(userId, { friends: updatedFriends });

    const friend = await this.repo.userById(friendId);
    if (friend) {
      const friendFriends = [...(friend.friends || [])].filter(id => id !== userId);
      await this.repo.updateUser(friendId, { friends: friendFriends });
    }

    return true;
  }

  async getFriends(userId) {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const friendIds = user.friends || [];
    const friends = [];
    for (const id of friendIds) {
      const friend = await this.repo.userById(id);
      if (friend) friends.push(friend);
    }

    return friends;
  }

  async getFriendRequests(userId) {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const requestIds = user.friendRequests || [];
    const requests = [];
    for (const id of requestIds) {
      const requester = await this.repo.userById(id);
      if (requester) requests.push(requester);
    }

    return requests;
  }

  async createDirectMessage(participantIds) {
    const existing = await this.repo.directMessages(participantIds);
    if (existing.length > 0) {
      return existing[0];
    }

    const dm = {
      id: uuidv4(),
      participants: participantIds,
      messages: []
    };

    return await this.repo.createDirectMessage(dm);
  }

  async getDirectMessage(participantIds) {
    const dms = await this.repo.directMessages(participantIds);
    return dms[0] || null;
  }

  async getDirectMessageById(id) {
    return await this.repo.directMessageById(id);
  }

  async sendDirectMessage(dmId, { content, authorId }) {
    const dm = await this.repo.directMessageById(dmId);
    if (!dm) throw new Error('对话不存在');

    const msg = {
      id: uuidv4(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    const messages = [...(dm.messages || []), msg];
    await this.repo.updateDirectMessage(dmId, { messages });

    return msg;
  }

  async getDirectMessagesForUser(userId) {
    const allDms = await this.repo.queryAllDirectMessages?.();
    if (!allDms) return [];
    
    return allDms.filter(dm => dm.participants?.includes(userId));
  }
}

export class NotificationService {
  constructor(repo) {
    this.repo = repo;
  }

  async getNotifications(userId, options = {}) {
    return await this.repo.notifications(userId, options);
  }

  async createNotification(userId, type, title, message, data = {}) {
    const notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      isRead: false
    };

    return await this.repo.createNotification(notification);
  }

  async markNotificationRead(id) {
    return await this.repo.markNotificationRead(id);
  }

  async markAllNotificationsRead(userId) {
    await this.repo.markAllNotificationsRead(userId);
  }

  async createPostNotification(postId, authorId, actorId, actorName, type) {
    const author = await this.repo.userById(authorId);
    if (!author || authorId === actorId) return;

    const titles = {
      comment: '新评论',
      reply: '新回复',
      upvote: '点赞',
      downvote: '点踩'
    };

    const messages = {
      comment: `${actorName} 评论了您的帖子`,
      reply: `${actorName} 回复了您`,
      upvote: `${actorName} 点赞了您的帖子`,
      downvote: `${actorName} 点踩了您的帖子`
    };

    return await this.createNotification(authorId, type, titles[type], messages[type], { postId, actorId });
  }
}

export class PollService {
  constructor(repo) {
    this.repo = repo;
  }

  async createPoll({ question, options, authorId, postId, expiresAt, allowMultiple = false }) {
    const poll = {
      id: uuidv4(),
      question,
      options: options.map((opt, idx) => ({ id: `opt-${idx}`, text: opt, votes: [] })),
      authorId,
      postId,
      expiresAt,
      allowMultiple,
      totalVotes: 0
    };

    return await this.repo.createPoll(poll);
  }

  async votePoll(pollId, userId, optionIds) {
    const poll = await this.repo.pollById(pollId);
    if (!poll) throw new Error('投票不存在');

    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      throw new Error('投票已过期');
    }

    let options = [...(poll.options || [])];
    let totalVotes = poll.totalVotes || 0;

    for (const opt of options) {
      opt.votes = (opt.votes || []).filter(id => id !== userId);
    }

    for (const optionId of optionIds) {
      const opt = options.find(o => o.id === optionId);
      if (opt) {
        opt.votes.push(userId);
        totalVotes++;
      }
    }

    return await this.repo.updatePoll(pollId, { options, totalVotes });
  }
}

export class TagService {
  constructor(repo) {
    this.repo = repo;
  }

  async getAllTags() {
    return await this.repo.tags();
  }

  async upsertTag(name, color) {
    return await this.repo.upsertTag(name, color);
  }

  async updateTag(name, updates) {
    return await this.repo.updateTag(name, updates);
  }
}