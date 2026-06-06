import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Poll, User } from '../types';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

const MIN_LEVEL_FOR_POLL = 3;

export class PollService {
  constructor(private repo: Repository) {}

  async createPoll({ question, options, authorId, postId, expiresAt, allowMultiple = false }: {
    question: string;
    options: string[];
    authorId: string;
    postId: string;
    expiresAt?: string;
    allowMultiple?: boolean;
  }): Promise<Poll> {
    const user = await this.repo.userById(authorId) as User | null;
    if (!user) {
      throw new Error('用户不存在');
    }

    const level = this.calcLevel(user.xp || 0);
    if (level.level < MIN_LEVEL_FOR_POLL) {
      throw new Error(`需要达到 ${MIN_LEVEL_FOR_POLL} 级才能发起投票帖，当前等级：${level.level}`);
    }

    const poll: Omit<Poll, 'createdAt' | 'totalVotes'> = {
      id: uuidv4(),
      question,
      options: options.map((opt, idx) => ({ id: `opt-${idx}`, text: opt, votes: [] as string[] })),
      authorId,
      postId,
      expiresAt,
      allowMultiple
    };

    return await this.repo.createPoll(poll) as Poll;
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

  async votePoll(pollId: string, userId: string, optionIds: string[]): Promise<Poll> {
    const poll = await this.repo.pollById(pollId) as Poll | null;
    if (!poll) throw new Error('投票不存在');

    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      throw new Error('投票已过期');
    }

    let options: PollOption[] = [...(poll.options || [])];
    let totalVotes = poll.totalVotes || 0;

    let votesRemoved = 0;
    for (const opt of options) {
      const before = (opt.votes || []).length;
      opt.votes = (opt.votes || []).filter(id => id !== userId);
      votesRemoved += before - opt.votes.length;
    }

    totalVotes -= votesRemoved;

    for (const optionId of optionIds) {
      const opt = options.find(o => o.id === optionId);
      if (opt) {
        opt.votes.push(userId);
        totalVotes++;
      }
    }

    return await this.repo.updatePoll(pollId, { options, totalVotes }) as Poll;
  }

  async getPollById(pollId: string): Promise<Poll | null> {
    return await this.repo.pollById(pollId) as Poll | null;
  }

  async getPollsForPost(postId: string): Promise<Poll | null> {
    const polls = await this.repo.polls() as Poll[];
    return polls.find(p => p.postId === postId) || null;
  }

  async deletePoll(pollId: string, userId: string, userRole: string): Promise<boolean> {
    const poll = await this.repo.pollById(pollId) as Poll | null;
    if (!poll) throw new Error('投票不存在');

    if (poll.authorId !== userId && userRole !== 'admin') {
      throw new Error('没有权限删除此投票');
    }

    return await this.repo.deletePoll(pollId);
  }
}