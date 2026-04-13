import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Sliding Window Log rate limiter.
 *
 * Stores each request timestamp as a member in a SORTED SET.
 * Atomically prunes expired entries, checks the count, and
 * conditionally adds the new entry — preventing concurrent
 * requests from both slipping past the limit.
 *
 * Redis commands: TIME, ZREMRANGEBYSCORE, ZCARD, ZADD, PEXPIRE, PTTL, ZRANGE
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/sliding-window-log.ts
 */
export const SlidingWindowLogAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = KEYS[2]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    local time = redis.call('TIME')
    local now_ms = time[1] * 1000 + math.floor(time[2] / 1000)
    local member = time[1] .. ':' .. time[2]

    local window_start = now_ms - ttl_ms

    redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

    local count = redis.call('ZCARD', key)

    if count < limit then
      redis.call('ZADD', key, now_ms, member)
      redis.call('PEXPIRE', key, ttl_ms)
      return { count + 1, redis.call('PTTL', key), -1, 0 }
    end

    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_ms = ttl_ms
    if #oldest >= 2 then
      retry_ms = tonumber(oldest[2]) + ttl_ms - now_ms
    end

    return { limit + 1, retry_ms, -1, 0 }
  `,
};
