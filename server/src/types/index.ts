export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
  bio: string;
  role: 'member' | 'admin';
  xp: number;
  theme: string;
  accentColor: string;
  uiSettings: UISettings;
  friends: string[];
  friendRequests: string[];
  isVerified: boolean;
  createdAt: string;
}

export interface UISettings {
  fontSize: 'sm' | 'base' | 'lg';
  compactMode: boolean;
  sidebarCollapsed: boolean;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  category: string;
  tags: string[];
  flair: string;
  upvotes: string[];
  downvotes: string[];
  views: number;
  commentCount: number;
  isPinned: boolean;
  pollId?: string;
  channelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  isPublic: boolean;
  ownerId: string;
  memberIds: string[];
  messageCount?: number;
  createdAt?: string;
}

export interface DirectMessage {
  id: string;
  participants: string[];
  messages: Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
    reactions: Record<string, string[]>;
  }>;
  messageCount?: number;
  createdAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface Tag {
  name: string;
  count: number;
  color: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  authorId: string;
  postId?: string;
  createdAt: string;
  expiresAt?: string;
  allowMultiple: boolean;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  upvotes: string[];
  replyCount: number;
  createdAt: string;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  commentId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface DmMessage {
  id: string;
  dmId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  messageType: 'channel' | 'dm';
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface Column {
  id: string;
  title: string;
  description: string;
  authorId: string;
  posts: string[];
  createdAt: string;
  isPublic: boolean;
}