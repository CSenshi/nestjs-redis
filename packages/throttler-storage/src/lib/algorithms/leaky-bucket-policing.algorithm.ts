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
 */
export const LeakyBucketPolicingAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local window_ms = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local leak_rate = capacity / (window_ms / 1000)

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

    local expire_ms = math.ceil(capacity / leak_rate) * 1000 + 1000

    if level + 1 <= capacity then
      level = level + 1
      redis.call('HSET', key, 'level', tostring(level), 'last_leak', tostring(now))
      redis.call('PEXPIRE', key, expire_ms)
      return { math.ceil(level), redis.call('PTTL', key), -1, 0 }
    end

    redis.call('HSET', key, 'level', tostring(level), 'last_leak', tostring(now))
    redis.call('PEXPIRE', key, expire_ms)
    local retry_ms = math.ceil(1000 / leak_rate)
    return { capacity + 1, retry_ms, -1, 0 }
  `,
};
