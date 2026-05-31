import { jest } from '@jest/globals';
import { createMockRepo, mockRepo } from '../__mocks__/services.js';
import bcrypt from 'bcryptjs';
import { UserService } from '../../dist/services/UserService.js';

describe('UserService', () => {
  let userService;
  let mockRepoInstance;

  beforeEach(() => {
    mockRepoInstance = createMockRepo();
    userService = new UserService(mockRepoInstance);

    mockRepo.data.users = [];
    mockRepo.data.channels = [];
  });

  describe('createUser', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await userService.createUser(userData);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(result.passwordHash).toBeDefined();
      expect(mockRepoInstance.createUser).toHaveBeenCalled();
    });

    it('should throw error when email already exists', async () => {
      mockRepo.data.users = [{ email: 'test@example.com' }];
      mockRepoInstance.userByEmail.mockResolvedValue(mockRepo.data.users[0]);

      await expect(userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('该邮箱已被注册');
    });

    it('should throw error when username already exists', async () => {
      mockRepo.data.users = [{ username: 'testuser' }];
      mockRepoInstance.userByEmail.mockResolvedValue(null);
      mockRepoInstance.userByUsername.mockResolvedValue(mockRepo.data.users[0]);

      await expect(userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('该用户名已被使用');
    });

    it('should set default bio when not provided', async () => {
      const result = await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.bio).toBe('');
    });

    it('should add user to general channel if channel exists', async () => {
      mockRepo.data.channels = [{ id: 'channel-1', slug: 'general', memberIds: [] }];
      mockRepoInstance.channelBySlug.mockResolvedValue(mockRepo.data.channels[0]);

      await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockRepoInstance.updateChannel).toHaveBeenCalled();
    });
  });

  describe('verifyPassword', () => {
    beforeEach(async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockRepo.data.users = [{
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash
      }];
      mockRepoInstance.userByEmail.mockImplementation(async (email) => {
        return mockRepo.data.users.find(u => u.email === email) || null;
      });
    });

    it('should return user when password is valid', async () => {
      const result = await userService.verifyPassword('test@example.com', 'password123');

      expect(result).not.toBeNull();
    });

    it('should return null when user not found', async () => {
      mockRepoInstance.userByEmail.mockResolvedValue(null);

      const result = await userService.verifyPassword('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      mockRepo.data.users = [{ id: 'user-1', username: 'testuser' }];
      mockRepoInstance.userById.mockResolvedValue(mockRepo.data.users[0]);

      const result = await userService.getUserById('user-1');

      expect(result.id).toBe('user-1');
      expect(mockRepoInstance.userById).toHaveBeenCalledWith('user-1');
    });

    it('should return null when user not found', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockRepo.data.users = [{ id: 'user-1', email: 'test@example.com' }];
      mockRepoInstance.userByEmail.mockResolvedValue(mockRepo.data.users[0]);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result.email).toBe('test@example.com');
      expect(mockRepoInstance.userByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username', async () => {
      mockRepo.data.users = [{ id: 'user-1', username: 'testuser' }];
      mockRepoInstance.userByUsername.mockResolvedValue(mockRepo.data.users[0]);

      const result = await userService.getUserByUsername('testuser');

      expect(result.username).toBe('testuser');
      expect(mockRepoInstance.userByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const updates = { bio: 'New bio', avatar: 'new-avatar.png' };
      mockRepoInstance.updateUser.mockResolvedValue({ id: 'user-1', ...updates });

      const result = await userService.updateUser('user-1', updates);

      expect(result.bio).toBe('New bio');
      expect(result.avatar).toBe('new-avatar.png');
      expect(mockRepoInstance.updateUser).toHaveBeenCalledWith('user-1', updates);
    });

    it('should throw error when updating to existing username', async () => {
      mockRepo.data.users = [
        { id: 'user-1', username: 'testuser' },
        { id: 'user-2', username: 'existinguser' }
      ];
      mockRepoInstance.userByUsername.mockImplementation(async (username) => {
        return mockRepo.data.users.find(u => u.username === username) || null;
      });

      await expect(userService.updateUser('user-1', { username: 'existinguser' }))
        .rejects.toThrow('该用户名已被使用');
    });
  });

  describe('addXp', () => {
    it('should add xp to user', async () => {
      mockRepo.data.users = [{ id: 'user-1', xp: 100 }];
      mockRepoInstance.userById.mockResolvedValue(mockRepo.data.users[0]);
      mockRepoInstance.updateUser.mockResolvedValue({ ...mockRepo.data.users[0], xp: 110 });

      await userService.addXp('user-1', 10);

      expect(mockRepoInstance.updateUser).toHaveBeenCalledWith('user-1', { xp: 110 });
    });

    it('should do nothing when user not found', async () => {
      mockRepoInstance.userById.mockResolvedValue(null);

      await userService.addXp('non-existent', 10);

      expect(mockRepoInstance.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users from repo', async () => {
      mockRepo.data.users = [{ id: 'user-1' }, { id: 'user-2' }];
      mockRepoInstance.users.mockResolvedValue(mockRepo.data.users);

      const result = await userService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(mockRepoInstance.users).toHaveBeenCalled();
    });
  });

  describe('calcLevel', () => {
    it('should return level 1 for xp < 100', () => {
      const result = userService.calcLevel(50);
      expect(result.level).toBe(1);
      expect(result.xp).toBe(50);
      expect(result.nextLevelXp).toBe(100);
    });

    it('should return level 2 for xp between 100 and 300', () => {
      const result = userService.calcLevel(200);
      expect(result.level).toBe(2);
      expect(result.xp).toBe(100);
      expect(result.nextLevelXp).toBe(200);
    });

    it('should return level 3 for xp between 300 and 600', () => {
      const result = userService.calcLevel(400);
      expect(result.level).toBe(3);
      expect(result.xp).toBe(100);
      expect(result.nextLevelXp).toBe(300);
    });

    it('should return level 4 for xp between 600 and 1000', () => {
      const result = userService.calcLevel(800);
      expect(result.level).toBe(4);
      expect(result.xp).toBe(200);
      expect(result.nextLevelXp).toBe(400);
    });

    it('should return level 5 for xp between 1000 and 1500', () => {
      const result = userService.calcLevel(1200);
      expect(result.level).toBe(5);
      expect(result.xp).toBe(200);
      expect(result.nextLevelXp).toBe(500);
    });

    it('should calculate higher levels correctly', () => {
      const result = userService.calcLevel(2000);
      expect(result.level).toBeGreaterThan(5);
    });
  });
});