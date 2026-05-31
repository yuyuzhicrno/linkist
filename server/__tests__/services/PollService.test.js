import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import { PollService } from '../../dist/services/PollService.js';

describe('PollService', () => {
  let pollService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    pollService = new PollService(mockRepoInstance);

    mockRepo.data.polls = [];
  });

  describe('createPoll', () => {
    it('should create a poll with required fields', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        authorId: 'user-1',
        postId: 'post-1'
      };

      const result = await pollService.createPoll(pollData);

      expect(result).toBeDefined();
      expect(result.question).toBe('What is your favorite color?');
      expect(result.options).toHaveLength(3);
      expect(result.authorId).toBe('user-1');
      expect(result.postId).toBe('post-1');
      expect(mockRepoInstance.createPoll).toHaveBeenCalled();
    });

    it('should create poll options with unique ids', async () => {
      const pollData = {
        question: 'Test poll?',
        options: ['Option A', 'Option B', 'Option C'],
        authorId: 'user-1',
        postId: 'post-1'
      };

      const result = await pollService.createPoll(pollData);

      expect(result.options[0].id).toBe('opt-0');
      expect(result.options[1].id).toBe('opt-1');
      expect(result.options[2].id).toBe('opt-2');
    });

    it('should set allowMultiple to false by default', async () => {
      const pollData = {
        question: 'Test poll?',
        options: ['A', 'B'],
        authorId: 'user-1',
        postId: 'post-1'
      };

      const result = await pollService.createPoll(pollData);

      expect(result.allowMultiple).toBe(false);
    });

    it('should include expiresAt when provided', async () => {
      const expiresAt = '2025-12-31T23:59:59Z';
      const pollData = {
        question: 'Test poll?',
        options: ['A', 'B'],
        authorId: 'user-1',
        postId: 'post-1',
        expiresAt
      };

      const result = await pollService.createPoll(pollData);

      expect(result.expiresAt).toBe(expiresAt);
    });
  });

  describe('votePoll', () => {
    beforeEach(() => {
      mockRepo.data.polls = [{
        id: 'poll-1',
        question: 'Test poll?',
        options: [
          { id: 'opt-0', text: 'Option A', votes: [] },
          { id: 'opt-1', text: 'Option B', votes: [] }
        ],
        authorId: 'user-1',
        totalVotes: 0
      }];
      mockRepoInstance.pollById.mockImplementation(async (id) => {
        return mockRepo.data.polls.find(p => p.id === id) || null;
      });
      mockRepoInstance.updatePoll.mockImplementation(async (id, updates) => {
        const poll = mockRepo.data.polls.find(p => p.id === id);
        if (poll) Object.assign(poll, updates);
        return poll;
      });
    });

    it('should add vote to selected option', async () => {
      const result = await pollService.votePoll('poll-1', 'voter-1', ['opt-0']);

      expect(mockRepoInstance.updatePoll).toHaveBeenCalled();
      const updateCall = mockRepoInstance.updatePoll.mock.calls[0];
      expect(updateCall[1].options[0].votes).toContain('voter-1');
      expect(updateCall[1].totalVotes).toBe(1);
    });

    it('should keep vote when voting for same option again', async () => {
      await pollService.votePoll('poll-1', 'voter-1', ['opt-0']);
      await pollService.votePoll('poll-1', 'voter-1', ['opt-0']);

      const updateCall = mockRepoInstance.updatePoll.mock.calls[1];
      expect(updateCall[1].options[0].votes).toContain('voter-1');
    });

    it('should throw error when poll not found', async () => {
      mockRepoInstance.pollById.mockResolvedValue(null);

      await expect(pollService.votePoll('non-existent', 'voter-1', ['opt-0']))
        .rejects.toThrow('投票不存在');
    });

    it('should throw error when poll is expired', async () => {
      mockRepo.data.polls[0].expiresAt = '2020-01-01T00:00:00Z';

      await expect(pollService.votePoll('poll-1', 'voter-1', ['opt-0']))
        .rejects.toThrow('投票已过期');
    });

    it('should decrease totalVotes when changing vote', async () => {
      await pollService.votePoll('poll-1', 'voter-1', ['opt-0']);
      expect(mockRepoInstance.updatePoll.mock.calls[0][1].totalVotes).toBe(1);

      await pollService.votePoll('poll-1', 'voter-1', ['opt-1']);
      const updateCall = mockRepoInstance.updatePoll.mock.calls[1];
      expect(updateCall[1].options[0].votes).not.toContain('voter-1');
      expect(updateCall[1].options[1].votes).toContain('voter-1');
      expect(updateCall[1].totalVotes).toBe(1);
    });

    it('should handle multiple votes correctly', async () => {
      await pollService.votePoll('poll-1', 'voter-1', ['opt-0', 'opt-1']);
      expect(mockRepoInstance.updatePoll.mock.calls[0][1].totalVotes).toBe(2);

      await pollService.votePoll('poll-1', 'voter-1', ['opt-0']);
      const updateCall = mockRepoInstance.updatePoll.mock.calls[1];
      expect(updateCall[1].options[0].votes).toContain('voter-1');
      expect(updateCall[1].options[1].votes).not.toContain('voter-1');
      expect(updateCall[1].totalVotes).toBe(1);
    });
  });

  describe('getPollById', () => {
    it('should return poll by id', async () => {
      mockRepo.data.polls = [{ id: 'poll-1', question: 'Test Poll' }];
      mockRepoInstance.pollById.mockResolvedValue(mockRepo.data.polls[0]);

      const result = await pollService.getPollById('poll-1');

      expect(result.id).toBe('poll-1');
      expect(mockRepoInstance.pollById).toHaveBeenCalledWith('poll-1');
    });

    it('should return null when poll not found', async () => {
      mockRepoInstance.pollById.mockResolvedValue(null);

      const result = await pollService.getPollById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getPollsForPost', () => {
    it('should return poll for post', async () => {
      mockRepo.data.polls = [{ id: 'poll-1', postId: 'post-1' }];
      mockRepoInstance.polls.mockResolvedValue(mockRepo.data.polls);

      const result = await pollService.getPollsForPost('post-1');

      expect(result.id).toBe('poll-1');
      expect(mockRepoInstance.polls).toHaveBeenCalled();
    });

    it('should return null when no poll for post', async () => {
      mockRepo.data.polls = [];
      mockRepoInstance.polls.mockResolvedValue([]);

      const result = await pollService.getPollsForPost('post-1');

      expect(result).toBeNull();
    });
  });

  describe('deletePoll', () => {
    beforeEach(() => {
      mockRepo.data.polls = [{
        id: 'poll-1',
        authorId: 'user-1',
        question: 'Test poll'
      }];
      mockRepoInstance.pollById.mockImplementation(async (id) => {
        return mockRepo.data.polls.find(p => p.id === id) || null;
      });
      mockRepoInstance.deletePoll.mockResolvedValue(true);
    });

    it('should delete poll when user is author', async () => {
      const result = await pollService.deletePoll('poll-1', 'user-1', 'member');

      expect(result).toBe(true);
      expect(mockRepoInstance.deletePoll).toHaveBeenCalledWith('poll-1');
    });

    it('should delete poll when user is admin', async () => {
      const result = await pollService.deletePoll('poll-1', 'other-user', 'admin');

      expect(result).toBe(true);
      expect(mockRepoInstance.deletePoll).toHaveBeenCalledWith('poll-1');
    });

    it('should throw error when poll not found', async () => {
      mockRepoInstance.pollById.mockResolvedValue(null);

      await expect(pollService.deletePoll('non-existent', 'user-1', 'member'))
        .rejects.toThrow('投票不存在');
    });

    it('should throw error when user is not author and not admin', async () => {
      await expect(pollService.deletePoll('poll-1', 'other-user', 'member'))
        .rejects.toThrow('没有权限删除此投票');
    });
  });
});