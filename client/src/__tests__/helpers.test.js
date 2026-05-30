import { timeAgo, escapeHtml, getAvatar, clsx } from '../utils/helpers';

describe('helpers', () => {
  describe('timeAgo', () => {
    test('returns "刚刚" for very recent times', () => {
      const recent = new Date().toISOString();
      expect(timeAgo(recent)).toBe('刚刚');
    });

    test('returns minutes ago', () => {
      const minutesAgo = new Date(Date.now() - 30 * 60000).toISOString();
      expect(timeAgo(minutesAgo)).toBe('30分钟前');
    });

    test('returns hours ago', () => {
      const hoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(timeAgo(hoursAgo)).toBe('3小时前');
    });

    test('returns days ago', () => {
      const daysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
      expect(timeAgo(daysAgo)).toBe('5天前');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('returns empty string for null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('getAvatar', () => {
    test('returns avatar URL when avatar exists', () => {
      const user = { username: 'test', avatar: 'https://example.com/avatar.jpg' };
      expect(getAvatar(user)).toBe('https://example.com/avatar.jpg');
    });

    test('returns initials object when no avatar', () => {
      const user = { username: 'john' };
      const result = getAvatar(user);
      expect(result.initials).toBe('JO');
      expect(result.color).toBeDefined();
    });

    test('returns null for undefined user', () => {
      expect(getAvatar(undefined)).toBeNull();
    });
  });

  describe('clsx', () => {
    test('combines class names', () => {
      expect(clsx('class1', 'class2')).toBe('class1 class2');
    });

    test('filters out falsy values', () => {
      expect(clsx('class1', false, null, 'class2')).toBe('class1 class2');
    });
  });
});