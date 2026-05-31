import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Poll } from '../types';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

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