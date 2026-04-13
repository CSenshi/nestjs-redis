import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Leaky Bucket (Shaping mode) rate limiter.
 *
 * Requests are queued and released at the leak rate. Each accepted
 * request carries a delay (in ms) indicating when it will be processed.
 * Requests are rejected only when the queue depth exceeds capacity.
 *
 * `timeToExpire` in the storage record carries the delay in seconds —
 * the time until the queued request should be processed.
 *
 * Redis commands: TIME, HGETALL, HSET, PEXPIRE
 */
export const LeakyBucketShapingAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local window_ms = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local leak_rate = capacity / (window_ms / 1000)

    local time = redis.call('TIME')
    local now = tonumber(time[1]) + tonumber(time[2]) / 1000000

    local data = redis.call('HGETALL', key)
    local next_free = now

    if #data > 0 then
      local fields = {}
      for i = 1, #data, 2 do
        fields[data[i]] = data[i + 1]
      end
      next_free = tonumber(fields['next_free']) or now
    end

    if next_free < now then
      next_free = now
    end

    local delay = next_free - now
    local queue_depth = delay * leak_rate

    local expire_ms = math.ceil(capacity / leak_rate) * 1000 + 1000

    if queue_depth + 1 <= capacity then
      local delay_ms = math.floor(delay * 1000)
      next_free = next_free + (1 / leak_rate)
      queue_depth = queue_depth + 1
      redis.call('HSET', key, 'next_free', tostring(next_free))
      redis.call('PEXPIRE', key, expire_ms)
      return { math.ceil(queue_depth), delay_ms, -1, 0 }
    end

    redis.call('HSET', key, 'next_free', tostring(next_free))
    redis.call('PEXPIRE', key, expire_ms)
    local retry_ms = math.ceil(1000 / leak_rate)
    return { capacity + 1, retry_ms, -1, 0 }
  `,
};
