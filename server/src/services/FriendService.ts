import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { User, DirectMessage } from '../types';

export class FriendService {
  constructor(private repo: Repository) {}

  async sendFriendRequest(fromId: string, toId: string): Promise<boolean> {
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

  async acceptFriendRequest(userId: string, requesterId: string): Promise<boolean> {
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

  async rejectFriendRequest(userId: string, requesterId: string): Promise<boolean> {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const requests = [...(user.friendRequests || [])];
    const updatedRequests = requests.filter(id => id !== requesterId);
    await this.repo.updateUser(userId, { friendRequests: updatedRequests });

    return true;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
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

  async getFriends(userId: string): Promise<User[]> {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const friendIds = user.friends || [];
    const friends: User[] = [];
    for (const id of friendIds) {
      const friend = await this.repo.userById(id);
      if (friend) friends.push(friend);
    }

    return friends;
  }

  async getFriendRequests(userId: string): Promise<User[]> {
    const user = await this.repo.userById(userId);
    if (!user) throw new Error('用户不存在');

    const requestIds = user.friendRequests || [];
    const requests: User[] = [];
    for (const id of requestIds) {
      const requester = await this.repo.userById(id);
      if (requester) requests.push(requester);
    }

    return requests;
  }

  async createDirectMessage(participantIds: string[]): Promise<DirectMessage> {
    const existing = await this.repo.directMessages(participantIds);
    if (existing.length > 0) {
      return existing[0];
    }

    const dm: DirectMessage = {
      id: uuidv4(),
      participants: participantIds,
      messages: []
    };

    return await this.repo.createDirectMessage(dm);
  }

  async getDirectMessage(participantIds: string[]): Promise<DirectMessage | null> {
    const dms = await this.repo.directMessages(participantIds);
    return dms[0] || null;
  }

  async getDirectMessageById(id: string): Promise<DirectMessage | null> {
    return await this.repo.directMessageById(id);
  }

  async sendDirectMessage(dmId: string, { content, authorId }: { content: string; authorId: string }) {
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

  async getDirectMessagesForUser(userId: string): Promise<DirectMessage[]> {
    const allDms = await this.repo.queryAllDirectMessages?.();
    if (!allDms) return [];
    
    return allDms.filter(dm => dm.participants?.includes(userId));
  }
}