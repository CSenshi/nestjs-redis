import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Fixed-window rate limiting algorithm.
 *
 * Counts hits in a fixed time window using a Redis STRING per throttlerName key.
 * When the limit is exceeded, a separate block key is set for `blockDurationMs`.
 *
 * This is the default algorithm used by `RedisThrottlerStorage`.
 */
export const FixedWindow: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local blockKey = KEYS[2]
    local ttlMs = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local blockDurationMs = tonumber(ARGV[4])

    -- 1. Check if already blocked
    if redis.call("EXISTS", blockKey) == 1 then
      return { limit + 1, -1, redis.call("PTTL", blockKey), 1 }
    end

    -- 2. If not blocked: Increment hit count
    local hits = redis.call("INCR", key)

    -- 3. If new key: set TTL (only if ttlMs > 0)
    if redis.call("PTTL", key) <= 0 and ttlMs > 0 then
      redis.call("PEXPIRE", key, ttlMs)
    end

    -- 4. If under limit: return normal response
    if hits <= limit then
      return { hits, redis.call("PTTL", key), -1, 0 }
    end

    -- 5. If over limit: set block flag (only if blockDurationMs > 0)
    if blockDurationMs > 0 then
      redis.call("SET", blockKey, "1", "PX", blockDurationMs)
      return { hits, redis.call("PTTL", key), blockDurationMs, 1 }
    else
      return { hits, redis.call("PTTL", key), -1, 0 }
    end
  `,
};
