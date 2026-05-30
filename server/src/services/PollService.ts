import { v4 as uuidv4 } from 'uuid';
import type { Repository } from '../repository';
import type { Poll, PollOption } from '../types';

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
    const pollOptions: PollOption[] = options.map((opt, idx) => ({ 
      id: `opt-${idx}`, 
      text: opt, 
      votes: [] 
    }));

    const poll: Omit<Poll, 'createdAt'> = {
      id: uuidv4(),
      question,
      options: pollOptions,
      authorId,
      postId,
      expiresAt,
      allowMultiple,
      totalVotes: 0
    };

    return await this.repo.createPoll(poll);
  }

  async votePoll(pollId: string, userId: string, optionIds: string[]): Promise<Poll | null> {
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