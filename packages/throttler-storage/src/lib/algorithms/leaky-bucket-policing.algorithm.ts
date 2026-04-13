import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Leaky Bucket (Policing mode) rate limiter.
 *
 * Bucket fills with requests and leaks at a constant rate.
 * Excess requests are rejected immediately when the bucket is full.
 *
 * The leak rate is derived as `limit / (ttlMs / 1000)` — the bucket
 * fully drains over one window.
 *
 * Redis commands: TIME, HGETALL, HSET, PEXPIRE, PTTL
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/leaky-bucket.ts
 */
export const LeakyBucketPolicingAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = KEYS[2]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local leak_rate = limit / (ttl_ms / 1000)

    local time = redis.call('TIME')
    local now = tonumber(time[1]) + tonumber(time[2]) / 1000000

    local data = redis.call('HGETALL', key)
    local level = 0
    local last_leak = now

    if #data > 0 then
      local fields = {}
      for i = 1, #data, 2 do
        fields[data[i]] = data[i + 1]
      end
      level = tonumber(fields['level']) or 0
      last_leak = tonumber(fields['last_leak']) or now
    end

    local elapsed = now - last_leak
    level = math.max(0, level - elapsed * leak_rate)

    local expire_ms = math.ceil(limit / leak_rate) * 1000 + 1000

    if level + 1 <= limit then
      level = level + 1
      redis.call('HSET', key, 'level', tostring(level), 'last_leak', tostring(now))
      redis.call('PEXPIRE', key, expire_ms)
      return { math.ceil(level), redis.call('PTTL', key), -1, 0 }
    end

    redis.call('HSET', key, 'level', tostring(level), 'last_leak', tostring(now))
    redis.call('PEXPIRE', key, expire_ms)
    local retry_ms = math.ceil(1000 / leak_rate)

    if block_duration_ms > 0 then
      redis.call('SET', block_key, '1', 'PX', block_duration_ms)
      return { limit + 1, retry_ms, block_duration_ms, 1 }
    end

    return { limit + 1, retry_ms, -1, 0 }
  `,
};
