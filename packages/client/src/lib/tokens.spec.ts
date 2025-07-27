import { RedisToken } from './tokens';

describe('RedisToken', () => {
  describe('token generation', () => {
    it('should generate default token when no connection name provided', () => {
      const token = RedisToken();
      expect(token).toBe('REDIS_CLIENT');
    });

    it('should generate default token when undefined connection name provided', () => {
      const token = RedisToken(undefined);
      expect(token).toBe('REDIS_CLIENT');
    });

    it('should generate named token when connection name provided', () => {
      const token = RedisToken('cache');
      expect(token).toBe('REDIS_CLIENT_CACHE');
    });

    it('should convert connection name to uppercase', () => {
      const token = RedisToken('my-cache');
      expect(token).toBe('REDIS_CLIENT_MY-CACHE');
    });

    it('should handle connection names with underscores', () => {
      const token = RedisToken('user_sessions');
      expect(token).toBe('REDIS_CLIENT_USER_SESSIONS');
    });

    it('should handle connection names with numbers', () => {
      const token = RedisToken('cache123');
      expect(token).toBe('REDIS_CLIENT_CACHE123');
    });

    it('should handle empty string connection name', () => {
      const token = RedisToken('');
      expect(token).toBe('REDIS_CLIENT');
    });

    it('should handle connection names with special characters', () => {
      const token = RedisToken('my-cache_connection.test');
      expect(token).toBe('REDIS_CLIENT_MY-CACHE_CONNECTION.TEST');
    });
  });

  describe('token consistency', () => {
    it('should generate the same token for the same connection name', () => {
      const token1 = RedisToken('cache');
      const token2 = RedisToken('cache');
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different connection names', () => {
      const token1 = RedisToken('cache');
      const token2 = RedisToken('sessions');
      expect(token1).not.toBe(token2);
    });
  });
});
