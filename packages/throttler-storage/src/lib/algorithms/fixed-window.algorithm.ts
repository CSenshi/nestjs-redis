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
    local window_ms = tonumber(ARGV[1])
    local max_requests = tonumber(ARGV[2])

    local count = redis.call('INCR', key)

    if count == 1 then
      redis.call('PEXPIRE', key, window_ms)
    end

    local pttl = redis.call('PTTL', key)

    return { count, pttl, -1, 0 }
  `,
};
