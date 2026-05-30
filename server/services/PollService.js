import { v4 as uuidv4 } from 'uuid';

export class PollService {
  constructor(repo) {
    this.repo = repo;
  }

  async createPoll({ question, options, authorId, postId, expiresAt, allowMultiple = false }) {
    const poll = {
      id: uuidv4(),
      question,
      options: options.map((opt, idx) => ({ id: `opt-${idx}`, text: opt, votes: [] })),
      authorId,
      postId,
      expiresAt,
      allowMultiple,
      totalVotes: 0
    };

    return await this.repo.createPoll(poll);
  }

  async votePoll(pollId, userId, optionIds) {
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