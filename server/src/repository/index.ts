import type { User, Post, Channel, DirectMessage, Notification, Tag, Poll, Comment, Reply, ChannelMessage, DmMessage } from '../types';

export interface Repository {
  type: 'file' | 'postgres';
  
  // User operations
  users(): Promise<User[]>;
  userById(id: string): Promise<User | null>;
  userByEmail(email: string): Promise<User | null>;
  userByUsername(username: string): Promise<User | null>;
  createUser(user: Omit<User, 'createdAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  // Post operations
  posts(options?: { page?: number; limit?: number; authorId?: string; channelId?: string; tag?: string }): Promise<{ posts: Post[]; total: number; page: number; limit: number }>;
  postById(id: string): Promise<Post | null>;
  createPost(post: Omit<Post, 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'views' | 'commentCount'>): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<boolean>;

  // Channel operations
  channels(options?: { includePrivate?: boolean; userId?: string }): Promise<Channel[]>;
  channelById(id: string): Promise<Channel | null>;
  channelBySlug(slug: string): Promise<Channel | null>;
  createChannel(channel: Omit<Channel, 'createdAt'>): Promise<Channel>;
  updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null>;

  // DirectMessage operations
  directMessages(participants: string[]): Promise<DirectMessage[]>;
  directMessageById(id: string): Promise<DirectMessage | null>;
  createDirectMessage(dm: Omit<DirectMessage, 'createdAt'>): Promise<DirectMessage>;
  updateDirectMessage(id: string, updates: Partial<DirectMessage>): Promise<DirectMessage | null>;
  queryAllDirectMessages?(): Promise<DirectMessage[]>;

  // Notification operations
  notifications(userId: string, options?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'createdAt' | 'isRead'>): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | null>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Tag operations
  tags(): Promise<Tag[]>;
  upsertTag(name: string, color?: string): Promise<Tag>;
  updateTag(name: string, updates: Partial<Tag>): Promise<Tag | null>;

  // Poll operations
  polls(): Promise<Poll[]>;
  pollById(id: string): Promise<Poll | null>;
  createPoll(poll: Omit<Poll, 'createdAt' | 'totalVotes'>): Promise<Poll>;
  updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | null>;

  // Comment operations
  commentById(id: string): Promise<Comment | null>;
  postComments(postId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, 'createdAt' | 'upvotes' | 'replyCount'>): Promise<Comment>;
  commentUpvote(commentId: string, userId: string): Promise<Comment | null>;
  commentReplies(commentId: string): Promise<Reply[]>;
  createReply(reply: Omit<Reply, 'createdAt'>): Promise<Reply>;

  // Message operations
  channelMessages(channelId: string, options?: { limit?: number; offset?: number }): Promise<ChannelMessage[]>;
  createChannelMessage(msg: Omit<ChannelMessage, 'createdAt'>): Promise<ChannelMessage>;
  dmMessages(dmId: string, options?: { limit?: number; offset?: number }): Promise<DmMessage[]>;
  createDmMessage(msg: Omit<DmMessage, 'createdAt'>): Promise<DmMessage>;

  // Reaction operations
  messageReactions(messageId: string, messageType: 'channel' | 'dm'): Promise<{ emoji: string; userIds: string[] }[]>;
  toggleReaction(messageId: string, messageType: 'channel' | 'dm', emoji: string, userId: string): Promise<{ emoji: string; userIds: string[] }[]>;
}