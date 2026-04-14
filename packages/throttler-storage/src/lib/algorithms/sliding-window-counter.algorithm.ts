import type { IThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Sliding Window Counter rate limiter.
 *
 * Keeps two fixed-window counters (current and previous) and computes
 * a weighted count based on how far into the current window we are.
 * Atomically reads both counters, evaluates the weighted estimate,
 * and conditionally increments — preventing concurrent requests from
 * slipping past the limit.
 *
 * Both window keys are derived from KEYS[1] (base key) so they share
 * the same hash tag and map to the same slot in Redis Cluster.
 *
 * Redis commands: TIME, GET, INCR, PEXPIRE, PTTL
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/sliding-window-counter.ts
 */
export const SlidingWindowCounterAlgorithm: IThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = key .. ':block'
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local window_seconds = math.floor(ttl_ms / 1000)

    local time = redis.call('TIME')
    local now_seconds = tonumber(time[1])

    local current_window = math.floor(now_seconds / window_seconds)
    local previous_window = current_window - 1
    local elapsed = (now_seconds % window_seconds) / window_seconds

    local current_key = key .. ':' .. current_window
    local previous_key = key .. ':' .. previous_window

    local prev_count = tonumber(redis.call('GET', previous_key) or '0') or 0
    local current_count = tonumber(redis.call('GET', current_key) or '0') or 0

    local weighted_prev = prev_count * (1 - elapsed)
    local estimated = weighted_prev + current_count

    if estimated >= limit then
      local retry_ms = math.ceil(ttl_ms * (1 - elapsed))
      if block_duration_ms > 0 then
        redis.call('SET', block_key, '1', 'PX', block_duration_ms)
        return { limit + 1, retry_ms, block_duration_ms, 1 }
      end
      return { limit + 1, retry_ms, -1, 0 }
    end

    local new_count = redis.call('INCR', current_key)

    if new_count == 1 then
      redis.call('PEXPIRE', current_key, ttl_ms * 2)
    end

    return { new_count, redis.call('PTTL', current_key), -1, 0 }
  `,
};
