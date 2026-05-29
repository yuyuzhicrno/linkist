import { schemas, sanitizeInput, sanitizeObject } from '../../middleware/validation.js';

describe('Validation Schemas', () => {
  describe('register schema', () => {
    it('should validate valid registration data', () => {
      const result = schemas.register.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const result = schemas.register.safeParse({
        username: 'a',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('用户名至少2个字符');
      }
    });

    it('should reject invalid email', () => {
      const result = schemas.register.safeParse({
        username: 'testuser',
        email: 'invalid',
        password: 'password123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('邮箱格式不正确');
      }
    });

    it('should reject short password', () => {
      const result = schemas.register.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码至少6个字符');
      }
    });

    it('should reject username with special characters', () => {
      const result = schemas.register.safeParse({
        username: 'test@user',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createPost schema', () => {
    it('should validate valid post data', () => {
      const result = schemas.createPost.safeParse({
        title: 'Test Post',
        content: 'This is a test post content'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = schemas.createPost.safeParse({
        title: '',
        content: 'Content'
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long title', () => {
      const result = schemas.createPost.safeParse({
        title: 'a'.repeat(201),
        content: 'Content'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sendMessage schema', () => {
    it('should validate valid message', () => {
      const result = schemas.sendMessage.safeParse({
        content: 'Hello world'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = schemas.sendMessage.safeParse({
        content: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long message', () => {
      const result = schemas.sendMessage.safeParse({
        content: 'a'.repeat(5001)
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should remove on* event handlers', () => {
      const input = '<div onclick="alert(1)">Test</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('should return null for null input', () => {
      expect(sanitizeInput(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(sanitizeInput(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties', () => {
      const obj = {
        name: '<script>alert(1)</script>Name',
        description: 'Normal description',
        count: 5
      };
      const result = sanitizeObject(obj);
      expect(result.name).toBe('Name');
      expect(result.description).toBe('Normal description');
      expect(result.count).toBe(5);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          bio: '<script>alert(1)</script>Bio'
        }
      };
      const result = sanitizeObject(obj);
      expect(result.user.bio).toBe('Bio');
    });
  });
});