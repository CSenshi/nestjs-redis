import type { ThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

/**
 * Token Bucket rate limiter.
 *
 * Stores tokens and last-refill timestamp in a HASH.
 * Atomically calculates tokens added since last refill, then tries
 * to consume one token. Allows short bursts up to `limit` (bucket capacity).
 *
 * The refill rate is derived as `limit / (ttlMs / 1000)` — the bucket
 * fully refills over one window.
 *
 * Redis commands: TIME, HGETALL, HSET, PEXPIRE, PTTL
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/token-bucket.ts
 */
export const TokenBucketAlgorithm: ThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local window_ms = tonumber(ARGV[1])
    local max_tokens = tonumber(ARGV[2])
    local refill_rate = max_tokens / (window_ms / 1000)

    local time = redis.call('TIME')
    local now = tonumber(time[1]) + tonumber(time[2]) / 1000000

    local data = redis.call('HGETALL', key)
    local tokens = max_tokens
    local last_refill = now

    if #data > 0 then
      local fields = {}
      for i = 1, #data, 2 do
        fields[data[i]] = data[i + 1]
      end
      tokens = tonumber(fields['tokens']) or max_tokens
      last_refill = tonumber(fields['last_refill']) or now
    end

    local elapsed = now - last_refill
    tokens = math.min(max_tokens, tokens + elapsed * refill_rate)

    local expire_ms = math.ceil(max_tokens / refill_rate) * 1000 + 1000

    if tokens >= 1 then
      tokens = tokens - 1
      redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
      redis.call('PEXPIRE', key, expire_ms)
      return { max_tokens - math.floor(tokens), redis.call('PTTL', key), -1, 0 }
    end

    redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
    redis.call('PEXPIRE', key, expire_ms)
    local retry_ms = math.ceil(1000 / refill_rate)
    return { max_tokens + 1, retry_ms, -1, 0 }
  `,
};
