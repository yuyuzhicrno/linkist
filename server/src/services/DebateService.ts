import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Debate, DebateArgument, DebateVote, User } from '../types';

const MIN_LEVEL_FOR_DEBATE = 5;
const MIN_DEBATE_DURATION_DAYS = 7;

export class DebateService {
  constructor(private repo: Repository) {}

  async createDebate({ proposition, authorId, postId, expiresAt }: {
    proposition: string;
    authorId: string;
    postId?: string;
    expiresAt: string;
  }): Promise<Debate> {
    const user = await this.repo.userById(authorId) as User | null;
    if (!user) {
      throw new Error('用户不存在');
    }

    const level = this.calcLevel(user.xp || 0);
    if (level.level < MIN_LEVEL_FOR_DEBATE) {
      throw new Error(`需要达到 ${MIN_LEVEL_FOR_DEBATE} 级才能发起争辩帖，当前等级：${level.level}`);
    }

    const expiresDate = new Date(expiresAt);
    const now = new Date();
    const minExpiresDate = new Date(now.getTime() + MIN_DEBATE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    
    if (expiresDate < minExpiresDate) {
      throw new Error(`争辩帖截止时间不得少于 ${MIN_DEBATE_DURATION_DAYS} 天`);
    }

    const debate: Omit<Debate, 'createdAt'> = {
      id: uuidv4(),
      proposition,
      authorId,
      postId,
      expiresAt,
      status: 'ongoing',
      proVotes: 0,
      conVotes: 0
    };

    return await this.repo.createDebate(debate) as Debate;
  }

  async addArgument({ debateId, authorId, side, content, replyToId }: {
    debateId: string;
    authorId: string;
    side: 'pro' | 'con';
    content: string;
    replyToId?: string;
  }): Promise<DebateArgument> {
    const debate = await this.repo.debateById(debateId) as Debate | null;
    if (!debate) {
      throw new Error('争辩帖不存在');
    }

    if (debate.status === 'resolved') {
      throw new Error('争辩帖已结束，无法添加论点');
    }

    const argument: Omit<DebateArgument, 'createdAt'> = {
      id: uuidv4(),
      debateId,
      authorId,
      side,
      content,
      replyToId,
      upvotes: [],
      downvotes: []
    };

    return await this.repo.createDebateArgument(argument) as DebateArgument;
  }

  async voteDebate({ debateId, userId, side }: {
    debateId: string;
    userId: string;
    side: 'pro' | 'con';
  }): Promise<Debate> {
    const debate = await this.repo.debateById(debateId) as Debate | null;
    if (!debate) {
      throw new Error('争辩帖不存在');
    }

    if (debate.status === 'resolved') {
      throw new Error('争辩帖已结束，无法投票');
    }

    if (new Date(debate.expiresAt) < new Date()) {
      throw new Error('争辩帖已过期');
    }

    const existingVote = await this.repo.getDebateVote(debateId, userId);
    if (existingVote) {
      if (existingVote.side === side) {
        await this.repo.removeDebateVote(existingVote.id);
        if (side === 'pro') {
          debate.proVotes = Math.max(0, debate.proVotes - 1);
        } else {
          debate.conVotes = Math.max(0, debate.conVotes - 1);
        }
      } else {
        await this.repo.updateDebateVote(existingVote.id, { side });
        if (side === 'pro') {
          debate.proVotes++;
          debate.conVotes = Math.max(0, debate.conVotes - 1);
        } else {
          debate.conVotes++;
          debate.proVotes = Math.max(0, debate.proVotes - 1);
        }
      }
    } else {
      const vote: Omit<DebateVote, 'createdAt'> = {
        id: uuidv4(),
        debateId,
        userId,
        side
      };
      await this.repo.createDebateVote(vote);
      
      if (side === 'pro') {
        debate.proVotes++;
      } else {
        debate.conVotes++;
      }
    }

    return await this.repo.updateDebate(debateId, debate) as Debate;
  }

  async resolveDebate(debateId: string): Promise<Debate> {
    const debate = await this.repo.debateById(debateId) as Debate | null;
    if (!debate) {
      throw new Error('争辩帖不存在');
    }

    if (debate.status === 'resolved') {
      throw new Error('争辩帖已结束');
    }

    let winner: 'pro' | 'con' | undefined;
    if (debate.proVotes > debate.conVotes) {
      winner = 'pro';
    } else if (debate.conVotes > debate.proVotes) {
      winner = 'con';
    }

    return await this.repo.updateDebate(debateId, {
      ...debate,
      status: 'resolved',
      winner
    }) as Debate;
  }

  async getDebateById(debateId: string): Promise<Debate | null> {
    return await this.repo.debateById(debateId) as Debate | null;
  }

  async getDebates(options?: { limit?: number; offset?: number }): Promise<{ debates: Debate[]; total: number }> {
    return await this.repo.debates(options) as { debates: Debate[]; total: number };
  }

  async getDebateArguments(debateId: string): Promise<DebateArgument[]> {
    return await this.repo.debateArguments(debateId) as DebateArgument[];
  }

  async getUserDebateVote(debateId: string, userId: string): Promise<DebateVote | null> {
    return await this.repo.getDebateVote(debateId, userId) as DebateVote | null;
  }

  private calcLevel(xp: number): { level: number; xp: number; nextLevelXp: number } {
    if (xp < 100) return { level: 1, xp, nextLevelXp: 100 };
    if (xp < 300) return { level: 2, xp: xp - 100, nextLevelXp: 200 };
    if (xp < 600) return { level: 3, xp: xp - 300, nextLevelXp: 300 };
    if (xp < 1000) return { level: 4, xp: xp - 600, nextLevelXp: 400 };
    if (xp < 1500) return { level: 5, xp: xp - 1000, nextLevelXp: 500 };
    const level = Math.floor((Math.sqrt(2 * xp / 100) + 1));
    const needed = level > 5 ? 400 + (level - 4) * 100 : [100, 200, 300, 400, 500][Math.min(level - 1, 4)];
    return { level, xp: xp - (level > 5 ? 1100 + (level - 5) * 400 + (level - 5) * (level - 6) * 100 : 0), nextLevelXp: needed };
  }
}