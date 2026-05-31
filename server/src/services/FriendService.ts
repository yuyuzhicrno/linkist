import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { User, DirectMessage, DmMessage } from '../types';

export class FriendService {
  constructor(private repo: Repository) {}

  async sendFriendRequest(fromId: string, toId: string): Promise<boolean> {
    if (fromId === toId) {
      throw new Error('不能向自己发送好友请求');
    }

    const toUser = await this.repo.userById(toId) as User | null;
    if (!toUser) throw new Error('用户不存在');

    const fromUser = await this.repo.userById(fromId) as User | null;
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

  async acceptFriendRequest(userId: string, requesterId: string): Promise<boolean> {
    const user = await this.repo.userById(userId) as User | null;
    if (!user) throw new Error('用户不存在');

    const requests = [...(user.friendRequests || [])];
    if (!requests.includes(requesterId)) {
      throw new Error('好友请求不存在');
    }

    const updatedRequests = requests.filter(id => id !== requesterId);
    const friends = [...(user.friends || []), requesterId];
    await this.repo.updateUser(userId, { friendRequests: updatedRequests, friends });

    const requester = await this.repo.userById(requesterId) as User | null;
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

  async rejectFriendRequest(userId: string, requesterId: string): Promise<boolean> {
    const user = await this.repo.userById(userId) as User | null;
    if (!user) throw new Error('用户不存在');

    const requests = [...(user.friendRequests || [])];
    const updatedRequests = requests.filter(id => id !== requesterId);
    await this.repo.updateUser(userId, { friendRequests: updatedRequests });

    return true;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const user = await this.repo.userById(userId) as User | null;
    if (!user) throw new Error('用户不存在');

    const friends = [...(user.friends || [])];
    if (!friends.includes(friendId)) {
      throw new Error('不是好友关系');
    }

    const updatedFriends = friends.filter(id => id !== friendId);
    await this.repo.updateUser(userId, { friends: updatedFriends });

    const friend = await this.repo.userById(friendId) as User | null;
    if (friend) {
      const friendFriends = [...(friend.friends || [])].filter(id => id !== userId);
      await this.repo.updateUser(friendId, { friends: friendFriends });
    }

    return true;
  }

  async getFriends(userId: string): Promise<User[]> {
    const user = await this.repo.userById(userId) as User | null;
    if (!user) throw new Error('用户不存在');

    const friendIds = user.friends || [];
    const friends: User[] = [];
    for (const id of friendIds) {
      const friend = await this.repo.userById(id) as User | null;
      if (friend) friends.push(friend);
    }

    return friends;
  }

  async getFriendRequests(userId: string): Promise<User[]> {
    const user = await this.repo.userById(userId) as User | null;
    if (!user) throw new Error('用户不存在');

    const requestIds = user.friendRequests || [];
    const requests: User[] = [];
    for (const id of requestIds) {
      const requester = await this.repo.userById(id) as User | null;
      if (requester) requests.push(requester);
    }

    return requests;
  }

  async createDirectMessage(participantIds: string[]): Promise<DirectMessage> {
    const existing = await this.repo.directMessages(participantIds);
    if (existing.length > 0) {
      return existing[0] as DirectMessage;
    }

    const dm: DirectMessage = {
      id: uuidv4(),
      participants: participantIds
    };

    return await this.repo.createDirectMessage(dm) as DirectMessage;
  }

  async getDirectMessage(participantIds: string[]): Promise<DirectMessage | null> {
    const dms = await this.repo.directMessages(participantIds);
    return (dms[0] as DirectMessage) || null;
  }

  async getDirectMessageById(id: string): Promise<DirectMessage | null> {
    return await this.repo.directMessageById(id) as DirectMessage | null;
  }

  async sendDirectMessage(dmId: string, { content, authorId }: { content: string; authorId: string }): Promise<DmMessage> {
    const dm = await this.repo.directMessageById(dmId) as DirectMessage | null;
    if (!dm) throw new Error('对话不存在');

    const msg: Omit<DmMessage, 'createdAt'> = {
      id: uuidv4(),
      dmId,
      authorId,
      content,
      reactions: {}
    };

    const savedMsg = await this.repo.createDmMessage(msg) as DmMessage;
    
    const dmMessages = await this.repo.dmMessages(dmId);
    const messageCount = dmMessages.length;
    await this.repo.updateDirectMessage(dmId, { messageCount });

    return savedMsg;
  }

  async getDirectMessagesForUser(userId: string): Promise<DirectMessage[]> {
    if (typeof this.repo.directMessages !== 'function') return [];
    
    const allDms = await this.repo.directMessages();
    if (!allDms) return [];
    
    return (allDms as DirectMessage[]).filter(dm => dm.participants?.includes(userId));
  }
}