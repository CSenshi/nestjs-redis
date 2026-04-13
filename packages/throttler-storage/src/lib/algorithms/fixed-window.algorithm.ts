import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Fixed Window Counter rate limiter.
 *
 * Uses a single STRING key per window.
 * Atomically increments the counter and sets the expiry on the first request.
 *
 * Redis commands: INCR, PEXPIRE, PTTL
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/fixed-window.ts
 */
export const FixedWindowAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = KEYS[2]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    local count = redis.call('INCR', key)

    if count == 1 then
      redis.call('PEXPIRE', key, ttl_ms)
    end

    local pttl = redis.call('PTTL', key)

    return { count, pttl, -1, 0 }
  `,
};
