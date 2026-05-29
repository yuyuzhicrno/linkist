import { validateConfig, generateSecureSecret, getJwtSecret } from '../../config/index.js';

describe('Config Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('should skip validation in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev_secret';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw error in production without required vars', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.SEED_PASSWORD;
      expect(() => validateConfig()).toThrow();
    });

    it('should throw error for insecure JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'linkist_dev_secret_2026';
      process.env.SEED_PASSWORD = 'prod_db_pass_xyz_789';
      expect(() => validateConfig()).toThrow('JWT_SECRET 使用了不安全的默认值');
    });
  });

  describe('generateSecureSecret', () => {
    it('should generate a hex string', () => {
      const secret = generateSecureSecret(32);
      expect(secret).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate correct length', () => {
      const secret = generateSecureSecret(32);
      expect(secret.length).toBe(64);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateSecureSecret();
      const secret2 = generateSecureSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('getJwtSecret', () => {
    it('should return env JWT_SECRET if set', () => {
      process.env.JWT_SECRET = 'test_secret';
      expect(getJwtSecret()).toBe('test_secret');
    });

    it('should throw in production without JWT_SECRET', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow('生产环境必须设置 JWT_SECRET');
    });

    it('should generate secret in development without JWT_SECRET', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      const secret = getJwtSecret();
      expect(secret).toMatch(/^[0-9a-f]+$/);
    });
  });
});