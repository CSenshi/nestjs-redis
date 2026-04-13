import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Fixed-window rate limiting algorithm.
 *
 * Counts hits in a fixed time window using a Redis STRING per throttlerName key.
 * When the limit is exceeded, a separate block key is set for `blockDurationMs`.
 *
 * This is the default algorithm used by `RedisThrottlerStorage`.
 */
export const DefaultNestjsLimit: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = KEYS[2]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    -- 1. Check if already blocked
    if redis.call("EXISTS", block_key) == 1 then
      return { limit + 1, -1, redis.call("PTTL", block_key), 1 }
    end

    -- 2. If not blocked: Increment hit count
    local hits = redis.call("INCR", key)

    -- 3. If new key: set TTL (only if ttl_ms > 0)
    if redis.call("PTTL", key) <= 0 and ttl_ms > 0 then
      redis.call("PEXPIRE", key, ttl_ms)
    end

    -- 4. If under limit: return normal response
    if hits <= limit then
      return { hits, redis.call("PTTL", key), -1, 0 }
    end

    -- 5. If over limit: set block flag (only if block_duration_ms > 0)
    if block_duration_ms > 0 then
      redis.call("SET", block_key, "1", "PX", block_duration_ms)
      return { hits, redis.call("PTTL", key), block_duration_ms, 1 }
    else
      return { hits, redis.call("PTTL", key), -1, 0 }
    end
  `,
};
