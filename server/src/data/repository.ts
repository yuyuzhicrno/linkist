import pg from 'pg';
import type { Low } from 'lowdb';
import type { Repository } from '../repository/index';
import type {
  User, Post, Channel, DirectMessage, Notification,
  Tag, Poll, Comment, Reply, ChannelMessage, DmMessage,
  Column, ColumnArticle, Debate, DebateArgument, DebateVote
} from '../types/index';

const { Pool } = pg;

export interface DbData {
  users: User[];
  posts: Post[];
  channels: Channel[];
  directMessages: DirectMessage[];
  columns: Column[];
  tags: Tag[];
  polls: Poll[];
  debates: Debate[];
  debate_arguments: DebateArgument[];
  debate_votes: DebateVote[];
  notifications: Notification[];
  post_comments?: Comment[];
  comment_replies?: Reply[];
  channel_messages?: ChannelMessage[];
  dm_messages?: DmMessage[];
  user_channel_reads?: { channelId: string; userId: string; lastReadMessageId: string; readAt: string }[];
  message_reactions?: { id: string; messageId: string; messageType: string; emoji: string; userId: string; createdAt: string }[];
  column_articles?: ColumnArticle[];
  column_posts?: { columnId: string; postId: string; addedAt: string }[];
}

export class FileRepository implements Repository {
  type: 'file' = 'file';
  db: Low<DbData>;
  data!: DbData;

  constructor(dbInstance: Low<DbData>) {
    this.db = dbInstance;
  }

  async init(): Promise<void> {
    this.data = this.db.data;
    if (!this.data.post_comments) this.data.post_comments = [];
    if (!this.data.comment_replies) this.data.comment_replies = [];
    if (!this.data.channel_messages) this.data.channel_messages = [];
    if (!this.data.dm_messages) this.data.dm_messages = [];
    if (!this.data.user_channel_reads) this.data.user_channel_reads = [];
  }

  async close(): Promise<void> {}

  async users(): Promise<User[]> {
    return this.data.users || [];
  }

  async userById(id: string): Promise<User | null> {
    return this.data.users?.find(u => u.id === id) || null;
  }

  async userByEmail(email: string): Promise<User | null> {
    return this.data.users?.find(u => u.email === email) || null;
  }

  async userByUsername(username: string): Promise<User | null> {
    return this.data.users?.find(u => u.username === username) || null;
  }

  async createUser(user: Omit<User, 'createdAt'>): Promise<User> {
    if (!this.data.users) this.data.users = [];
    const newUser = {
      ...user,
      createdAt: new Date().toISOString(),
      friends: user.friends || [],
      friendRequests: user.friendRequests || [],
      xp: user.xp || 0
    } as User;
    this.data.users.push(newUser);
    await this.db.write();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.data.users?.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.users[idx], updates);
    await this.db.write();
    return this.data.users[idx];
  }

  async posts(options: { page?: number; limit?: number; authorId?: string; channelId?: string; tag?: string } = {}): Promise<{ posts: Post[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, authorId, channelId, tag } = options;
    let posts = [...(this.data.posts || [])];

    if (authorId) posts = posts.filter(p => p.authorId === authorId);
    if (channelId) posts = posts.filter(p => p.channelId === channelId);
    if (tag) posts = posts.filter(p => p.tags?.includes(tag));

    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return { posts: paginatedPosts, total: posts.length, page, limit };
  }

  async postById(id: string): Promise<Post | null> {
    return this.data.posts?.find(p => p.id === id) || null;
  }

  async createPost(post: Omit<Post, 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'views' | 'commentCount'>): Promise<Post> {
    if (!this.data.posts) this.data.posts = [];
    const newPost = {
      ...post,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvotes: [],
      downvotes: [],
      views: 0,
      commentCount: 0,
      isPinned: false
    } as Post;
    this.data.posts.push(newPost);
    await this.db.write();
    return newPost;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
    const idx = this.data.posts?.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.posts[idx], updates, { updatedAt: new Date().toISOString() });
    await this.db.write();
    return this.data.posts[idx];
  }

  async deletePost(id: string): Promise<boolean> {
    const idx = this.data.posts?.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.posts.splice(idx, 1);
    const deletedCommentIds = (this.data.post_comments || []).filter(c => c.postId === id).map(c => c.id);
    this.data.post_comments = (this.data.post_comments || []).filter(c => c.postId !== id);
    this.data.comment_replies = (this.data.comment_replies || []).filter(r => !deletedCommentIds.includes(r.commentId));
    await this.db.write();
    return true;
  }

  async channels(options: { includePrivate?: boolean; userId?: string } = {}): Promise<Channel[]> {
    const { includePrivate = false, userId } = options;
    let channels = [...(this.data.channels || [])];

    if (!includePrivate && userId) {
      channels = channels.filter(c =>
        c.isPublic ||
        c.memberIds?.includes(userId) ||
        c.ownerId === userId
      );
    }

    return channels;
  }

  async channelById(id: string): Promise<Channel | null> {
    return this.data.channels?.find(c => c.id === id) || null;
  }

  async channelBySlug(slug: string): Promise<Channel | null> {
    return this.data.channels?.find(c => c.slug === slug) || null;
  }

  async createChannel(channel: Omit<Channel, 'createdAt' | 'messageCount'>): Promise<Channel> {
    if (!this.data.channels) this.data.channels = [];
    const newChannel = {
      ...channel,
      createdAt: new Date().toISOString(),
      memberIds: channel.memberIds || [],
      messageCount: 0
    } as Channel;
    this.data.channels.push(newChannel);
    await this.db.write();
    return newChannel;
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
    const idx = this.data.channels?.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.channels[idx], updates);
    await this.db.write();
    return this.data.channels[idx];
  }

  async deleteChannel(id: string): Promise<boolean> {
    const idx = this.data.channels?.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.channels.splice(idx, 1);
    this.data.channel_messages = (this.data.channel_messages || []).filter(m => m.channelId !== id);
    await this.db.write();
    return true;
  }

  async directMessages(participants?: string[]): Promise<DirectMessage[]> {
    if (!participants) return this.data.directMessages || [];
    return (this.data.directMessages || []).filter(dm =>
      dm.participants?.length === participants.length &&
      participants.every(p => dm.participants?.includes(p))
    );
  }

  async directMessageById(id: string): Promise<DirectMessage | null> {
    return this.data.directMessages?.find(dm => dm.id === id) || null;
  }

  async createDirectMessage(dm: { participants: string[] }): Promise<DirectMessage> {
    if (!this.data.directMessages) this.data.directMessages = [];
    const newDm = {
      id: crypto.randomUUID(),
      ...dm,
      createdAt: new Date().toISOString(),
      messageCount: 0
    } as DirectMessage;
    this.data.directMessages.push(newDm);
    await this.db.write();
    return newDm;
  }

  async updateDirectMessage(id: string, updates: Partial<DirectMessage>): Promise<DirectMessage | null> {
    const idx = this.data.directMessages?.findIndex(dm => dm.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.directMessages[idx], updates);
    await this.db.write();
    return this.data.directMessages[idx];
  }

  async deleteDirectMessage(id: string): Promise<boolean> {
    const idx = this.data.directMessages?.findIndex(dm => dm.id === id);
    if (idx === -1) return false;
    this.data.directMessages.splice(idx, 1);
    this.data.dm_messages = (this.data.dm_messages || []).filter(m => m.dmId !== id);
    await this.db.write();
    return true;
  }

  async notifications(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    let notifications = (this.data.notifications || []).filter(n => n.userId === userId);

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * limit;
    return notifications.slice(start, start + limit);
  }

  async createNotification(notification: Omit<Notification, 'createdAt' | 'isRead'>): Promise<Notification> {
    if (!this.data.notifications) this.data.notifications = [];
    const newNotification = {
      ...notification,
      createdAt: new Date().toISOString(),
      isRead: false
    } as Notification;
    this.data.notifications.push(newNotification);
    await this.db.write();
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<Notification | null> {
    const idx = this.data.notifications?.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.data.notifications[idx].isRead = true;
    await this.db.write();
    return this.data.notifications[idx];
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    (this.data.notifications || []).forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
    await this.db.write();
  }

  async deleteNotification(id: string): Promise<boolean> {
    const idx = (this.data.notifications || []).findIndex(n => n.id === id);
    if (idx === -1) return false;
    this.data.notifications.splice(idx, 1);
    await this.db.write();
    return true;
  }

  async tags(): Promise<Tag[]> {
    return this.data.tags || [];
  }

  async upsertTag(name: string, color?: string): Promise<Tag> {
    if (!this.data.tags) this.data.tags = [];
    const existing = this.data.tags.find(t => t.name === name);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      if (color) existing.color = color;
    } else {
      this.data.tags.push({ name, count: 1, color: color || '#7c3aed' });
    }
    await this.db.write();
    return this.data.tags.find(t => t.name === name)!;
  }

  async updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null> {
    const idx = this.data.tags?.findIndex(t => t.name === name);
    if (idx === -1) return null;
    Object.assign(this.data.tags[idx], updates);
    await this.db.write();
    return this.data.tags[idx];
  }

  async polls(): Promise<Poll[]> {
    return this.data.polls || [];
  }

  async pollById(id: string): Promise<Poll | null> {
    return this.data.polls?.find(p => p.id === id) || null;
  }

  async createPoll(poll: Omit<Poll, 'createdAt' | 'totalVotes'>): Promise<Poll> {
    if (!this.data.polls) this.data.polls = [];
    const newPoll = {
      ...poll,
      createdAt: new Date().toISOString(),
      totalVotes: 0
    } as Poll;
    this.data.polls.push(newPoll);
    await this.db.write();
    return newPoll;
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | null> {
    const idx = this.data.polls?.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.polls[idx], updates);
    await this.db.write();
    return this.data.polls[idx];
  }

  async deletePoll(id: string): Promise<boolean> {
    const idx = this.data.polls?.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.polls.splice(idx, 1);
    await this.db.write();
    return true;
  }

  async debates(_options?: { limit?: number; offset?: number }): Promise<{ debates: Debate[]; total: number }> {
    const debates = this.data.debates || [];
    return { debates, total: debates.length };
  }

  async debateById(id: string): Promise<Debate | null> {
    return this.data.debates?.find(d => d.id === id) || null;
  }

  async createDebate(debate: Omit<Debate, 'createdAt'>): Promise<Debate> {
    if (!this.data.debates) this.data.debates = [];
    const newDebate = {
      ...debate,
      createdAt: new Date().toISOString()
    } as Debate;
    this.data.debates.push(newDebate);
    await this.db.write();
    return newDebate;
  }

  async updateDebate(id: string, updates: Partial<Debate>): Promise<Debate | null> {
    const idx = this.data.debates?.findIndex(d => d.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.debates[idx], updates);
    await this.db.write();
    return this.data.debates[idx];
  }

  async debateArguments(debateId: string): Promise<DebateArgument[]> {
    return (this.data.debate_arguments || []).filter(a => a.debateId === debateId);
  }

  async createDebateArgument(argument: Omit<DebateArgument, 'createdAt'>): Promise<DebateArgument> {
    if (!this.data.debate_arguments) this.data.debate_arguments = [];
    const newArgument = {
      ...argument,
      createdAt: new Date().toISOString()
    } as DebateArgument;
    this.data.debate_arguments.push(newArgument);
    await this.db.write();
    return newArgument;
  }

  async createDebateVote(vote: Omit<DebateVote, 'createdAt'>): Promise<DebateVote> {
    if (!this.data.debate_votes) this.data.debate_votes = [];
    const newVote = {
      ...vote,
      createdAt: new Date().toISOString()
    } as DebateVote;
    this.data.debate_votes.push(newVote);
    await this.db.write();
    return newVote;
  }

  async getDebateVote(debateId: string, userId: string): Promise<DebateVote | null> {
    return (this.data.debate_votes || []).find(v => v.debateId === debateId && v.userId === userId) || null;
  }

  async updateDebateVote(id: string, updates: Partial<DebateVote>): Promise<DebateVote | null> {
    const idx = this.data.debate_votes?.findIndex(v => v.id === id);
    if (idx === -1) return null;
    Object.assign(this.data.debate_votes[idx], updates);
    await this.db.write();
    return this.data.debate_votes[idx];
  }

  async removeDebateVote(id: string): Promise<boolean> {
    const idx = this.data.debate_votes?.findIndex(v => v.id === id);
    if (idx === -1) return false;
    this.data.debate_votes.splice(idx, 1);
    await this.db.write();
    return true;
  }

  async columns(_options?: { page?: number; limit?: number }): Promise<{ columns: Column[]; total: number }> {
    const columns = this.data.columns || [];
    return {
      columns: columns.map(col => ({
        ...col,
        articleCount: (this.data.column_articles || []).filter(a => a.columnId === col.id).length
      })),
      total: columns.length
    };
  }

  async columnById(id: string): Promise<Column | null> {
    return this.data.columns?.find(c => c.id === id) || null;
  }

  async columnBySlug(slug: string): Promise<Column | null> {
    return this.data.columns?.find(c => c.slug === slug) || null;
  }

  async createColumn(column: Column): Promise<Column> {
    if (!this.data.columns) this.data.columns = [];
    const newColumn = {
      ...column,
      createdAt: new Date().toISOString(),
      followers: []
    } as Column;
    this.data.columns.push(newColumn);
    await this.db.write();
    return newColumn;
  }

  async columnPosts(columnId: string, options: { limit?: number; offset?: number } = {}): Promise<{ posts: Post[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const columnPosts = (this.data.column_posts || [])
      .filter(cp => cp.columnId === columnId)
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(offset, offset + limit);

    const posts = columnPosts
      .map(cp => this.data.posts?.find(p => p.id === cp.postId))
      .filter((p): p is Post => Boolean(p));

    return { posts, total: (this.data.column_posts || []).filter(cp => cp.columnId === columnId).length };
  }

  async addColumnArticle(columnId: string, article: ColumnArticle): Promise<ColumnArticle | null> {
    if (!this.data.column_articles) this.data.column_articles = [];
    const column = this.data.columns?.find(c => c.id === columnId);
    if (!column) return null;

    const newArticle = {
      id: article.id,
      columnId,
      title: article.title,
      summary: article.summary || '',
      content: article.content || '',
      tags: article.tags || [],
      likes: [],
      views: 0,
      readTime: article.readTime || 1,
      createdAt: new Date().toISOString()
    } as ColumnArticle;

    this.data.column_articles.push(newArticle);

    if (article.id) {
      if (!this.data.column_posts) this.data.column_posts = [];
      this.data.column_posts.push({
        columnId,
        postId: article.id,
        addedAt: new Date().toISOString()
      });
    }

    await this.db.write();
    return newArticle;
  }

  async getColumnArticle(columnId: string, articleId: string): Promise<ColumnArticle | null> {
    const article = this.data.column_articles?.find(
      a => a.id === articleId && a.columnId === columnId
    );
    if (!article) return null;

    article.views = (article.views || 0) + 1;
    await this.db.write();
    return article;
  }

  async toggleColumnArticleLike(columnId: string, articleId: string, userId: string): Promise<ColumnArticle | null> {
    const article = this.data.column_articles?.find(
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

    await this.db.write();
    return article;
  }

  async toggleColumnFollow(columnId: string, userId: string): Promise<{ followed: boolean; followers: string[] } | null> {
    const column = this.data.columns?.find(c => c.id === columnId);
    if (!column) return null;

    column.followers = column.followers || [];
    const idx = column.followers.indexOf(userId);
    if (idx === -1) {
      column.followers.push(userId);
    } else {
      column.followers.splice(idx, 1);
    }

    await this.db.write();
    return { followed: idx === -1, followers: column.followers };
  }

  async commentById(commentId: string): Promise<Comment | null> {
    return this.data.post_comments?.find(c => c.id === commentId) || null;
  }

  async postComments(postId: string): Promise<Comment[]> {
    return (this.data.post_comments || [])
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createComment(comment: Omit<Comment, 'createdAt' | 'upvotes' | 'replyCount'>): Promise<Comment> {
    const { id, postId, authorId, content } = comment;
    const post = this.data.posts?.find(p => p.id === postId);
    if (!post) return null!;

    if (!this.data.post_comments) this.data.post_comments = [];
    const newComment = {
      id,
      postId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      upvotes: [],
      replyCount: 0
    } as Comment;
    this.data.post_comments.push(newComment);
    post.commentCount = (post.commentCount || 0) + 1;
    await this.db.write();
    return newComment;
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null> {
    const idx = this.data.post_comments?.findIndex(c => c.id === id);
    if (idx === undefined || idx === -1) return null;
    if (updates.content !== undefined) this.data.post_comments![idx].content = updates.content;
    if (updates.upvotes !== undefined) this.data.post_comments![idx].upvotes = updates.upvotes;
    await this.db.write();
    return this.data.post_comments![idx];
  }

  async deleteComment(id: string): Promise<boolean> {
    const idx = this.data.post_comments?.findIndex(c => c.id === id);
    if (idx === undefined || idx === -1) return false;
    const comment = this.data.post_comments![idx];
    const post = this.data.posts?.find(p => p.id === comment.postId);
    if (post) post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    this.data.post_comments!.splice(idx, 1);
    this.data.comment_replies = (this.data.comment_replies || []).filter(r => r.commentId !== id);
    await this.db.write();
    return true;
  }

  async commentUpvote(commentId: string, userId: string): Promise<Comment | null> {
    const comment = this.data.post_comments?.find(c => c.id === commentId);
    if (!comment) return null;
    comment.upvotes = comment.upvotes || [];
    if (comment.upvotes.includes(userId)) {
      comment.upvotes = comment.upvotes.filter(id => id !== userId);
    } else {
      comment.upvotes.push(userId);
    }
    await this.db.write();
    return comment;
  }

  async commentDownvote(commentId: string, userId: string): Promise<Comment | null> {
    const comment = this.data.post_comments?.find(c => c.id === commentId);
    if (!comment) return null;
    comment.downvotes = comment.downvotes || [];
    if (comment.downvotes.includes(userId)) {
      comment.downvotes = comment.downvotes.filter(id => id !== userId);
    } else {
      comment.downvotes.push(userId);
    }
    await this.db.write();
    return comment;
  }

  async commentReplies(commentId: string): Promise<Reply[]> {
    return (this.data.comment_replies || [])
      .filter(r => r.commentId === commentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createReply(reply: Omit<Reply, 'createdAt'>): Promise<Reply> {
    const { id, commentId, authorId, content } = reply;
    const comment = this.data.post_comments?.find(c => c.id === commentId);
    if (!comment) return null!;

    if (!this.data.comment_replies) this.data.comment_replies = [];
    const newReply = {
      id,
      commentId,
      authorId,
      content,
      createdAt: new Date().toISOString()
    } as Reply;
    this.data.comment_replies.push(newReply);
    comment.replyCount = (comment.replyCount || 0) + 1;
    await this.db.write();
    return newReply;
  }

  async channelMessages(channelId: string, options: { limit?: number; offset?: number } = {}): Promise<ChannelMessage[]> {
    const { limit = 50, offset = 0 } = options;
    const messages = (this.data.channel_messages || [])
      .filter(m => m.channelId === channelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return messages.slice(offset, offset + limit);
  }

  async createChannelMessage(msg: Omit<ChannelMessage, 'createdAt'>): Promise<ChannelMessage> {
    const { id, channelId, authorId, content } = msg;
    const channel = this.data.channels?.find(c => c.id === channelId);
    if (!channel) return null!;

    if (!this.data.channel_messages) this.data.channel_messages = [];
    const newMsg = {
      id,
      channelId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    } as ChannelMessage;
    this.data.channel_messages.push(newMsg);
    channel.messageCount = (channel.messageCount || 0) + 1;
    await this.db.write();
    return newMsg;
  }

  async dmMessages(dmId: string, options: { limit?: number; offset?: number } = {}): Promise<DmMessage[]> {
    const { limit = 50, offset = 0 } = options;
    const messages = (this.data.dm_messages || [])
      .filter(m => m.dmId === dmId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return messages.slice(offset, offset + limit);
  }

  async createDmMessage(msg: Omit<DmMessage, 'createdAt'>): Promise<DmMessage> {
    const { id, dmId, authorId, content } = msg;
    const dm = this.data.directMessages?.find(d => d.id === dmId);
    if (!dm) return null!;

    if (!this.data.dm_messages) this.data.dm_messages = [];
    const newMsg = {
      id,
      dmId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {}
    } as DmMessage;
    this.data.dm_messages.push(newMsg);
    dm.messageCount = (dm.messageCount || 0) + 1;
    await this.db.write();
    return newMsg;
  }

  async toggleReaction(messageId: string, messageType: 'channel' | 'dm', emoji: string, userId: string): Promise<{ emoji: string; userIds: string[] }[]> {
    if (!this.data.message_reactions) this.data.message_reactions = [];

    const existingIdx = this.data.message_reactions.findIndex(
      r => r.messageId === messageId && r.messageType === messageType && r.emoji === emoji && r.userId === userId
    );

    if (existingIdx !== -1) {
      this.data.message_reactions.splice(existingIdx, 1);
    } else {
      this.data.message_reactions.push({
        id: crypto.randomUUID(),
        messageId,
        messageType,
        emoji,
        userId,
        createdAt: new Date().toISOString()
      });
    }

    await this.db.write();
    return await this.messageReactions(messageId, messageType);
  }

  private async messageReactions(messageId: string, messageType: string): Promise<{ emoji: string; userIds: string[] }[]> {
    const reactions: Record<string, string[]> = {};
    const messageReactions = (this.data.message_reactions || []).filter(r => r.messageId === messageId && r.messageType === messageType);

    for (const reaction of messageReactions) {
      if (!reactions[reaction.emoji]) {
        reactions[reaction.emoji] = [];
      }
      reactions[reaction.emoji].push(reaction.userId);
    }

    return Object.entries(reactions).map(([emoji, userIds]) => ({ emoji, userIds }));
  }

  async getLastReadMessageId(channelId: string, userId: string): Promise<string | null> {
    const read = this.data.user_channel_reads?.find(
      r => r.channelId === channelId && r.userId === userId
    );
    return read?.lastReadMessageId || null;
  }

  async markChannelRead(channelId: string, userId: string, lastReadMessageId: string): Promise<void> {
    if (!this.data.user_channel_reads) this.data.user_channel_reads = [];
    const idx = this.data.user_channel_reads.findIndex(
      r => r.channelId === channelId && r.userId === userId
    );
    if (idx !== -1) {
      this.data.user_channel_reads[idx].lastReadMessageId = lastReadMessageId;
      this.data.user_channel_reads[idx].readAt = new Date().toISOString();
    } else {
      this.data.user_channel_reads.push({
        channelId,
        userId,
        lastReadMessageId,
        readAt: new Date().toISOString()
      });
    }
    await this.db.write();
  }

  async getUnreadCount(channelId: string, userId: string): Promise<number> {
    const lastRead = await this.getLastReadMessageId(channelId, userId);
    const messages = (this.data.channel_messages || []).filter(m => m.channelId === channelId);
    if (!lastRead) return messages.length;
    const lastReadIdx = messages.findIndex(m => m.id === lastRead);
    if (lastReadIdx === -1) return messages.length;
    return Math.max(0, messages.length - lastReadIdx - 1);
  }
}

export class PostgresRepository implements Repository {
  type: 'postgres' = 'postgres';
  pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async init(): Promise<void> {
    await this._createTables();
  }

  private async _createTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT '',
        role VARCHAR(20) DEFAULT 'member',
        xp INTEGER DEFAULT 0,
        theme VARCHAR(20) DEFAULT 'dark',
        "accentColor" VARCHAR(20) DEFAULT '#7c3aed',
        "uiSettings" JSONB DEFAULT '{"fontSize":"base","compactMode":false,"sidebarCollapsed":false}',
        friends UUID[] DEFAULT '{}',
        "friendRequests" UUID[] DEFAULT '{}',
        "isVerified" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        "authorId" UUID REFERENCES users(id),
        category VARCHAR(50),
        tags TEXT[],
        flair VARCHAR(50),
        upvotes UUID[] DEFAULT '{}',
        downvotes UUID[] DEFAULT '{}',
        views INTEGER DEFAULT 0,
        "commentCount" INTEGER DEFAULT 0,
        "isPinned" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        color VARCHAR(20),
        "isPublic" BOOLEAN DEFAULT true,
        "ownerId" UUID REFERENCES users(id),
        "memberIds" UUID[] DEFAULT '{}',
        "messageCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants UUID[] NOT NULL,
        "messageCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        name VARCHAR(30) PRIMARY KEY,
        count INTEGER DEFAULT 0,
        color VARCHAR(20) DEFAULT '#7c3aed'
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        options JSONB NOT NULL,
        "totalVotes" INTEGER DEFAULT 0,
        "expiresAt" TIMESTAMP,
        "channelId" UUID REFERENCES channels(id),
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        "authorId" UUID REFERENCES users(id),
        followers UUID[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS column_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "columnId" UUID REFERENCES columns(id),
        "postId" UUID,
        title VARCHAR(200) NOT NULL,
        summary TEXT,
        content TEXT,
        tags TEXT[],
        likes UUID[] DEFAULT '{}',
        views INTEGER DEFAULT 0,
        "readTime" INTEGER DEFAULT 1,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.pool.query(sql, params);
    return result.rows[0] || null;
  }

  private async queryAll<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async users(): Promise<User[]> {
    return this.queryAll<User>('SELECT * FROM users');
  }

  async userById(id: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async userByEmail(email: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE email = $1', [email]);
  }

  async userByUsername(username: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE username = $1', [username]);
  }

  async createUser(user: Omit<User, 'createdAt'>): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (id, username, email, "passwordHash", avatar, bio, role, xp, theme, "accentColor", "uiSettings", friends, "friendRequests", "isVerified")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        user.id || crypto.randomUUID(),
        user.username,
        user.email,
        user.passwordHash,
        user.avatar || null,
        user.bio || '',
        user.role || 'member',
        user.xp || 0,
        user.theme || 'dark',
        user.accentColor || '#7c3aed',
        user.uiSettings || { fontSize: 'base', compactMode: false, sidebarCollapsed: false },
        user.friends || [],
        user.friendRequests || [],
        user.isVerified || false
      ]
    );
    return result.rows[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async posts(options: { page?: number; limit?: number; authorId?: string; channelId?: string; tag?: string } = {}): Promise<{ posts: Post[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, authorId, channelId, tag } = options;
    let where = '';
    const params: unknown[] = [];

    if (authorId) {
      where += ' WHERE "authorId" = $1';
      params.push(authorId);
    }
    if (channelId) {
      where += where ? ' AND "channelId" = $' + (params.length + 1) : ' WHERE "channelId" = $' + (params.length + 1);
      params.push(channelId);
    }
    if (tag) {
      where += where ? ' AND tags = $' + (params.length + 1) : ' WHERE tags = $' + (params.length + 1);
      params.push([tag]);
    }

    const countResult = await this.pool.query(`SELECT COUNT(*) FROM posts${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      `SELECT * FROM posts${where} ORDER BY "isPinned" DESC, "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    return { posts: result.rows, total, page, limit };
  }

  async postById(id: string): Promise<Post | null> {
    return this.queryOne<Post>('SELECT * FROM posts WHERE id = $1', [id]);
  }

  async createPost(post: Omit<Post, 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'views' | 'commentCount'>): Promise<Post> {
    const result = await this.pool.query(
      `INSERT INTO posts (id, title, content, "authorId", category, tags, flair, "channelId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        post.id || crypto.randomUUID(),
        post.title,
        post.content,
        post.authorId,
        post.category || '综合',
        post.tags || [],
        post.flair || '',
        post.channelId || null
      ]
    );
    return result.rows[0];
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE posts SET ${fields}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async channels(options: { includePrivate?: boolean; userId?: string } = {}): Promise<Channel[]> {
    const { includePrivate = false, userId } = options;
    if (includePrivate) {
      return this.queryAll<Channel>('SELECT * FROM channels');
    }
    if (userId) {
      return this.queryAll<Channel>(
        'SELECT * FROM channels WHERE "isPublic" = true OR "ownerId" = $1 OR $1 = ANY("memberIds")',
        [userId]
      );
    }
    return this.queryAll<Channel>('SELECT * FROM channels WHERE "isPublic" = true');
  }

  async channelById(id: string): Promise<Channel | null> {
    return this.queryOne<Channel>('SELECT * FROM channels WHERE id = $1', [id]);
  }

  async channelBySlug(slug: string): Promise<Channel | null> {
    return this.queryOne<Channel>('SELECT * FROM channels WHERE slug = $1', [slug]);
  }

  async createChannel(channel: Omit<Channel, 'createdAt' | 'messageCount'>): Promise<Channel> {
    const result = await this.pool.query(
      `INSERT INTO channels (id, name, slug, description, icon, color, "isPublic", "ownerId", "memberIds")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        channel.id || crypto.randomUUID(),
        channel.name,
        channel.slug,
        channel.description || '',
        channel.icon || '💬',
        channel.color || '#7c3aed',
        channel.isPublic ?? true,
        channel.ownerId,
        channel.memberIds || []
      ]
    );
    return result.rows[0];
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE channels SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async deleteChannel(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM channels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async directMessages(participants?: string[]): Promise<DirectMessage[]> {
    if (!participants) return this.queryAll<DirectMessage>('SELECT * FROM direct_messages');
    return this.queryAll<DirectMessage>(
      'SELECT * FROM direct_messages WHERE participants = $1',
      [participants]
    );
  }

  async directMessageById(id: string): Promise<DirectMessage | null> {
    return this.queryOne<DirectMessage>('SELECT * FROM direct_messages WHERE id = $1', [id]);
  }

  async createDirectMessage(dm: { participants: string[] }): Promise<DirectMessage> {
    const result = await this.pool.query(
      `INSERT INTO direct_messages (participants) VALUES ($1) RETURNING *`,
      [dm.participants]
    );
    return result.rows[0];
  }

  async updateDirectMessage(id: string, updates: Partial<DirectMessage>): Promise<DirectMessage | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE direct_messages SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async deleteDirectMessage(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM direct_messages WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async notifications(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    let where = '"userId" = $1';
    const params: unknown[] = [userId];

    if (unreadOnly) {
      where += ' AND "isRead" = false';
    }

    const result = await this.pool.query(
      `SELECT * FROM notifications WHERE ${where} ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  }

  async createNotification(notification: Omit<Notification, 'createdAt' | 'isRead'>): Promise<Notification> {
    const result = await this.pool.query(
      `INSERT INTO notifications (id, "userId", type, title, message, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [notification.id || crypto.randomUUID(), notification.userId, notification.type, notification.title, notification.message, notification.data || {}]
    );
    return result.rows[0];
  }

  async markNotificationRead(id: string): Promise<Notification | null> {
    const result = await this.pool.query(
      'UPDATE notifications SET "isRead" = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.pool.query('UPDATE notifications SET "isRead" = true WHERE "userId" = $1', [userId]);
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async tags(): Promise<Tag[]> {
    return this.queryAll<Tag>('SELECT * FROM tags ORDER BY count DESC');
  }

  async upsertTag(name: string, color?: string): Promise<Tag> {
    const result = await this.pool.query(
      `INSERT INTO tags (name, count, color) VALUES ($1, 1, $2)
       ON CONFLICT (name) DO UPDATE SET count = tags.count + 1, color = COALESCE($2, tags.color)
       RETURNING *`,
      [name, color || '#7c3aed']
    );
    return result.rows[0];
  }

  async updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE tags SET ${fields} WHERE name = $1 RETURNING *`,
      [name, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async polls(): Promise<Poll[]> {
    return this.queryAll<Poll>('SELECT * FROM polls ORDER BY "createdAt" DESC');
  }

  async pollById(id: string): Promise<Poll | null> {
    return this.queryOne<Poll>('SELECT * FROM polls WHERE id = $1', [id]);
  }

  async createPoll(poll: Omit<Poll, 'createdAt' | 'totalVotes'>): Promise<Poll> {
    const result = await this.pool.query(
      `INSERT INTO polls (id, question, options, "expiresAt", "authorId", "allowMultiple") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [poll.id || crypto.randomUUID(), poll.question, poll.options, poll.expiresAt || null, poll.authorId, poll.allowMultiple || false]
    );
    return result.rows[0];
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE polls SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async deletePoll(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM polls WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async debates(options: { limit?: number; offset?: number } = {}): Promise<{ debates: Debate[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const countResult = await this.pool.query('SELECT COUNT(*) FROM debates');
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      'SELECT * FROM debates ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return { debates: result.rows, total };
  }

  async debateById(id: string): Promise<Debate | null> {
    return this.queryOne<Debate>('SELECT * FROM debates WHERE id = $1', [id]);
  }

  async createDebate(debate: Omit<Debate, 'createdAt'>): Promise<Debate> {
    const result = await this.pool.query(
      `INSERT INTO debates (id, proposition, "authorId", "postId", "expiresAt", status, "proVotes", "conVotes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [debate.id || crypto.randomUUID(), debate.proposition, debate.authorId, debate.postId || null, debate.expiresAt, debate.status || 'ongoing', debate.proVotes || 0, debate.conVotes || 0]
    );
    return result.rows[0];
  }

  async updateDebate(id: string, updates: Partial<Debate>): Promise<Debate | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE debates SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async debateArguments(debateId: string): Promise<DebateArgument[]> {
    const result = await this.pool.query(
      'SELECT * FROM debate_arguments WHERE "debateId" = $1 ORDER BY "createdAt" ASC',
      [debateId]
    );
    return result.rows;
  }

  async createDebateArgument(argument: Omit<DebateArgument, 'createdAt'>): Promise<DebateArgument> {
    const result = await this.pool.query(
      `INSERT INTO debate_arguments (id, "debateId", "authorId", side, content, "replyToId", upvotes, downvotes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [argument.id || crypto.randomUUID(), argument.debateId, argument.authorId, argument.side, argument.content, argument.replyToId || null, argument.upvotes || [], argument.downvotes || []]
    );
    return result.rows[0];
  }

  async createDebateVote(vote: Omit<DebateVote, 'createdAt'>): Promise<DebateVote> {
    const result = await this.pool.query(
      `INSERT INTO debate_votes (id, "debateId", "userId", side) VALUES ($1, $2, $3, $4) RETURNING *`,
      [vote.id || crypto.randomUUID(), vote.debateId, vote.userId, vote.side]
    );
    return result.rows[0];
  }

  async getDebateVote(debateId: string, userId: string): Promise<DebateVote | null> {
    return this.queryOne<DebateVote>(
      'SELECT * FROM debate_votes WHERE "debateId" = $1 AND "userId" = $2',
      [debateId, userId]
    );
  }

  async updateDebateVote(id: string, updates: Partial<DebateVote>): Promise<DebateVote | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE debate_votes SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async removeDebateVote(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM debate_votes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async columns(_options?: { page?: number; limit?: number }): Promise<{ columns: Column[]; total: number }> {
    const { page = 1, limit = 20 } = _options || {};
    const countResult = await this.pool.query('SELECT COUNT(*) FROM columns');
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      'SELECT * FROM columns ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
      [limit, (page - 1) * limit]
    );

    return { columns: result.rows, total };
  }

  async columnById(id: string): Promise<Column | null> {
    return this.queryOne<Column>('SELECT * FROM columns WHERE id = $1', [id]);
  }

  async columnBySlug(slug: string): Promise<Column | null> {
    return this.queryOne<Column>('SELECT * FROM columns WHERE slug = $1', [slug]);
  }

  async createColumn(column: Column): Promise<Column> {
    const result = await this.pool.query(
      `INSERT INTO columns (id, title, slug, description, "authorId", "coverColor") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [column.id || crypto.randomUUID(), column.title, column.slug, column.description || '', column.authorId, column.coverColor || '#7c3aed']
    );
    return result.rows[0];
  }

  async columnPosts(columnId: string, options: { limit?: number; offset?: number } = {}): Promise<{ posts: Post[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM column_posts WHERE "columnId" = $1',
      [columnId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      `SELECT p.* FROM posts p
       JOIN column_posts cp ON p.id = cp."postId"
       WHERE cp."columnId" = $1
       ORDER BY cp."addedAt" DESC
       LIMIT $2 OFFSET $3`,
      [columnId, limit, offset]
    );

    return { posts: result.rows, total };
  }

  async addColumnArticle(columnId: string, article: ColumnArticle): Promise<ColumnArticle | null> {
    const column = await this.columnById(columnId);
    if (!column) return null;

    const { id, title, summary, content, tags, readTime } = article;
    const result = await this.pool.query(
      `INSERT INTO column_articles (id, "columnId", title, summary, content, tags, "readTime")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id || crypto.randomUUID(), columnId, title, summary || '', content || '', tags || [], readTime || 1]
    );

    return result.rows[0];
  }

  async getColumnArticle(columnId: string, articleId: string): Promise<ColumnArticle | null> {
    const article = await this.queryOne<ColumnArticle>(
      'SELECT * FROM column_articles WHERE id = $1 AND "columnId" = $2',
      [articleId, columnId]
    );
    if (!article) return null;

    await this.pool.query('UPDATE column_articles SET views = views + 1 WHERE id = $1', [articleId]);
    article.views = (article.views || 0) + 1;
    return article;
  }

  async toggleColumnArticleLike(columnId: string, articleId: string, userId: string): Promise<ColumnArticle | null> {
    const article = await this.getColumnArticle(columnId, articleId);
    if (!article) return null;

    const likes = article.likes || [];
    const likeIdx = likes.indexOf(userId);
    if (likeIdx === -1) {
      likes.push(userId);
    } else {
      likes.splice(likeIdx, 1);
    }

    await this.pool.query('UPDATE column_articles SET likes = $1 WHERE id = $2', [likes, articleId]);
    article.likes = likes;
    return article;
  }

  async toggleColumnFollow(columnId: string, userId: string): Promise<{ followed: boolean; followers: string[] } | null> {
    const column = await this.columnById(columnId);
    if (!column) return null;

    const followers = column.followers || [];
    const idx = followers.indexOf(userId);
    if (idx === -1) {
      followers.push(userId);
    } else {
      followers.splice(idx, 1);
    }

    await this.pool.query('UPDATE columns SET followers = $1 WHERE id = $2', [followers, columnId]);
    return { followed: idx === -1, followers };
  }

  async commentById(id: string): Promise<Comment | null> {
    return this.queryOne<Comment>('SELECT * FROM post_comments WHERE id = $1', [id]);
  }

  async postComments(postId: string): Promise<Comment[]> {
    return this.queryAll<Comment>(
      'SELECT * FROM post_comments WHERE "postId" = $1 ORDER BY "createdAt" ASC',
      [postId]
    );
  }

  async createComment(comment: Omit<Comment, 'createdAt' | 'upvotes' | 'replyCount'>): Promise<Comment> {
    const result = await this.pool.query(
      `INSERT INTO post_comments (id, "postId", "authorId", content) VALUES ($1, $2, $3, $4) RETURNING *`,
      [comment.id || crypto.randomUUID(), comment.postId, comment.authorId, comment.content]
    );
    await this.pool.query('UPDATE posts SET "commentCount" = "commentCount" + 1 WHERE id = $1', [comment.postId]);
    return result.rows[0];
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null> {
    const fields = Object.keys(updates).map(k => `"${k}" = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
    const result = await this.pool.query(
      `UPDATE post_comments SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return result.rows[0] || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    const comment = await this.commentById(id);
    if (!comment) return false;
    await this.pool.query('UPDATE posts SET "commentCount" = "commentCount" - 1 WHERE id = $1', [comment.postId]);
    const result = await this.pool.query('DELETE FROM post_comments WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async commentUpvote(commentId: string, userId: string): Promise<Comment | null> {
    const comment = await this.commentById(commentId);
    if (!comment) return null;
    const likes = comment.upvotes || [];
    const idx = likes.indexOf(userId);
    if (idx === -1) likes.push(userId);
    else likes.splice(idx, 1);
    await this.pool.query('UPDATE post_comments SET upvotes = $1 WHERE id = $2', [likes, commentId]);
    comment.upvotes = likes;
    return comment;
  }

  async commentDownvote(commentId: string, userId: string): Promise<Comment | null> {
    const comment = await this.commentById(commentId);
    if (!comment) return null;
    const dislikes = comment.downvotes || [];
    const idx = dislikes.indexOf(userId);
    if (idx === -1) dislikes.push(userId);
    else dislikes.splice(idx, 1);
    await this.pool.query('UPDATE post_comments SET downvotes = $1 WHERE id = $2', [dislikes, commentId]);
    comment.downvotes = dislikes;
    return comment;
  }

  async commentReplies(commentId: string): Promise<Reply[]> {
    return this.queryAll<Reply>(
      'SELECT * FROM comment_replies WHERE "commentId" = $1 ORDER BY "createdAt" ASC',
      [commentId]
    );
  }

  async createReply(reply: Omit<Reply, 'createdAt'>): Promise<Reply> {
    const result = await this.pool.query(
      `INSERT INTO comment_replies (id, "commentId", "authorId", content) VALUES ($1, $2, $3, $4) RETURNING *`,
      [reply.id || crypto.randomUUID(), reply.commentId, reply.authorId, reply.content]
    );
    await this.pool.query('UPDATE post_comments SET "replyCount" = "replyCount" + 1 WHERE id = $1', [reply.commentId]);
    return result.rows[0];
  }

  async channelMessages(channelId: string, options: { limit?: number; offset?: number } = {}): Promise<ChannelMessage[]> {
    const { limit = 50, offset = 0 } = options;
    return this.queryAll<ChannelMessage>(
      'SELECT * FROM channel_messages WHERE "channelId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [channelId, limit, offset]
    );
  }

  async createChannelMessage(msg: Omit<ChannelMessage, 'createdAt'>): Promise<ChannelMessage> {
    const result = await this.pool.query(
      `INSERT INTO channel_messages (id, "channelId", "authorId", content) VALUES ($1, $2, $3, $4) RETURNING *`,
      [msg.id || crypto.randomUUID(), msg.channelId, msg.authorId, msg.content]
    );
    await this.pool.query('UPDATE channels SET "messageCount" = "messageCount" + 1 WHERE id = $1', [msg.channelId]);
    return result.rows[0];
  }

  async dmMessages(dmId: string, options: { limit?: number; offset?: number } = {}): Promise<DmMessage[]> {
    const { limit = 50, offset = 0 } = options;
    return this.queryAll<DmMessage>(
      'SELECT * FROM dm_messages WHERE "dmId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [dmId, limit, offset]
    );
  }

  async createDmMessage(msg: Omit<DmMessage, 'createdAt'>): Promise<DmMessage> {
    const result = await this.pool.query(
      `INSERT INTO dm_messages (id, "dmId", "authorId", content) VALUES ($1, $2, $3, $4) RETURNING *`,
      [msg.id || crypto.randomUUID(), msg.dmId, msg.authorId, msg.content]
    );
    await this.pool.query('UPDATE direct_messages SET "messageCount" = "messageCount" + 1 WHERE id = $1', [msg.dmId]);
    return result.rows[0];
  }

  async toggleReaction(messageId: string, messageType: 'channel' | 'dm', emoji: string, userId: string): Promise<{ emoji: string; userIds: string[] }[]> {
    const table = messageType === 'channel' ? 'channel_messages' : 'dm_messages';
    const existing = await this.pool.query(
      `SELECT reactions FROM ${table} WHERE id = $1`,
      [messageId]
    );
    if (!existing.rows[0]) return [];

    const reactions = existing.rows[0].reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx === -1) reactions[emoji].push(userId);
    else reactions[emoji].splice(idx, 1);

    await this.pool.query(`UPDATE ${table} SET reactions = $1 WHERE id = $2`, [reactions, messageId]);
    return Object.entries(reactions).map(([e, u]) => ({ emoji: e, userIds: u as string[] }));
  }

  async getLastReadMessageId(channelId: string, userId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT "lastReadMessageId" FROM user_channel_reads WHERE "channelId" = $1 AND "userId" = $2',
      [channelId, userId]
    );
    return result.rows[0]?.lastReadMessageId || null;
  }

  async markChannelRead(channelId: string, userId: string, lastReadMessageId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_channel_reads ("channelId", "userId", "lastReadMessageId", "readAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("channelId", "userId") DO UPDATE SET "lastReadMessageId" = $3, "readAt" = NOW()`,
      [channelId, userId, lastReadMessageId]
    );
  }

  async getUnreadCount(channelId: string, userId: string): Promise<number> {
    const lastRead = await this.getLastReadMessageId(channelId, userId);
    if (!lastRead) {
      const result = await this.pool.query('SELECT COUNT(*) FROM channel_messages WHERE "channelId" = $1', [channelId]);
      return parseInt(result.rows[0].count);
    }
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM channel_messages WHERE "channelId" = $1 AND id > $2',
      [channelId, lastRead]
    );
    return parseInt(result.rows[0].count);
  }
}

export async function createRepository(
  type: 'file' | 'postgres',
  connectionString?: string | null,
  dbInstance?: Low<DbData> | null
): Promise<Repository> {
  if (type === 'postgres') {
    const repo = new PostgresRepository(connectionString!);
    await repo.init();
    return repo;
  }
  const repo = new FileRepository(dbInstance!);
  await repo.init();
  return repo;
}