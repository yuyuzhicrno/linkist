import type { User, Post, Channel, DirectMessage, Notification, Tag, Poll, Comment, Reply, ChannelMessage, DmMessage, Column, ColumnArticle } from '../types';

export interface Repository {
  type: 'file' | 'postgres';
  
  users(): Promise<User[]>;
  userById(id: string): Promise<User | null>;
  userByEmail(email: string): Promise<User | null>;
  userByUsername(username: string): Promise<User | null>;
  createUser(user: Omit<User, 'createdAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  posts(options?: { page?: number; limit?: number; authorId?: string; channelId?: string; tag?: string }): Promise<{ posts: Post[]; total: number; page?: number; limit?: number } | Post[]>;
  postById(id: string): Promise<Post | null>;
  createPost(post: Omit<Post, 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'views' | 'commentCount'>): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<boolean>;

  channels(options?: { includePrivate?: boolean; userId?: string }): Promise<Channel[]>;
  channelById(id: string): Promise<Channel | null>;
  channelBySlug(slug: string): Promise<Channel | null>;
  createChannel(channel: Omit<Channel, 'createdAt' | 'messageCount'>): Promise<Channel>;
  updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null>;

  directMessages(participants?: string[]): Promise<DirectMessage[]>;
  directMessageById(id: string): Promise<DirectMessage | null>;
  createDirectMessage(dm: { participants: string[] }): Promise<DirectMessage>;
  updateDirectMessage(id: string, updates: Partial<DirectMessage>): Promise<DirectMessage | null>;

  notifications(userId: string, options?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'createdAt' | 'isRead'>): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | null>;
  markAllNotificationsRead(userId: string): Promise<void>;

  tags(): Promise<Tag[]>;
  upsertTag(name: string, color?: string): Promise<Tag>;
  updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null>;

  polls(): Promise<Poll[]>;
  pollById(id: string): Promise<Poll | null>;
  createPoll(poll: Omit<Poll, 'createdAt' | 'totalVotes'>): Promise<Poll>;
  updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | null>;
  deletePoll(id: string): Promise<boolean>;

  commentById(id: string): Promise<Comment | null>;
  postComments(postId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, 'createdAt' | 'upvotes' | 'replyCount'>): Promise<Comment>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null>;
  deleteComment(id: string): Promise<boolean>;
  commentUpvote(commentId: string, userId: string): Promise<Comment | null>;
  commentReplies(commentId: string): Promise<Reply[]>;
  createReply(reply: Omit<Reply, 'createdAt'>): Promise<Reply>;

  channelMessages(channelId: string, options?: { limit?: number; offset?: number }): Promise<ChannelMessage[]>;
  createChannelMessage(msg: Omit<ChannelMessage, 'createdAt'>): Promise<ChannelMessage>;
  toggleReaction(messageId: string, messageType: 'channel' | 'dm', emoji: string, userId: string): Promise<{ emoji: string; userIds: string[] }[]>;

  dmMessages(dmId: string, options?: { limit?: number; offset?: number }): Promise<DmMessage[]>;
  createDmMessage(msg: Omit<DmMessage, 'createdAt'>): Promise<DmMessage>;

  columns(options?: { page?: number; limit?: number }): Promise<{ columns: Column[]; total: number } | Column[]>;
  columnById(id: string): Promise<Column | null>;
  columnBySlug(slug: string): Promise<Column | null>;
  createColumn(column: Column): Promise<Column>;
  columnPosts(columnId: string, options?: { limit?: number; offset?: number }): Promise<{ posts: Post[]; total: number } | Post[]>;
  addColumnArticle(columnId: string, article: ColumnArticle): Promise<ColumnArticle | null>;
  getColumnArticle(columnId: string, articleId: string): Promise<ColumnArticle | null>;
  toggleColumnArticleLike(columnId: string, articleId: string, userId: string): Promise<ColumnArticle | null>;
  toggleColumnFollow(columnId: string, userId: string): Promise<{ followed: boolean; followers: string[] } | null>;
}