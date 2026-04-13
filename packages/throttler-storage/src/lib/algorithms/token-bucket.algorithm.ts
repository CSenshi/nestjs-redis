import type { IThrottlerAlgorithm } from '../throttler-algorithm.interface.js';

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
export const TokenBucketAlgorithm: IThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = key .. ':block'
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local refill_rate = limit / (ttl_ms / 1000)

    local time = redis.call('TIME')
    local now = tonumber(time[1]) + tonumber(time[2]) / 1000000

    local data = redis.call('HGETALL', key)
    local tokens = limit
    local last_refill = now

    if #data > 0 then
      local fields = {}
      for i = 1, #data, 2 do
        fields[data[i]] = data[i + 1]
      end
      tokens = tonumber(fields['tokens']) or limit
      last_refill = tonumber(fields['last_refill']) or now
    end

    local elapsed = now - last_refill
    tokens = math.min(limit, tokens + elapsed * refill_rate)

    local expire_ms = math.ceil(limit / refill_rate) * 1000 + 1000

    if tokens >= 1 then
      tokens = tokens - 1
      redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
      redis.call('PEXPIRE', key, expire_ms)
      return { limit - math.floor(tokens), redis.call('PTTL', key), -1, 0 }
    end

    redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
    redis.call('PEXPIRE', key, expire_ms)
    local retry_ms = math.ceil(1000 / refill_rate)

    if block_duration_ms > 0 then
      redis.call('SET', block_key, '1', 'PX', block_duration_ms)
      return { limit + 1, retry_ms, block_duration_ms, 1 }
    end

    return { limit + 1, retry_ms, -1, 0 }
  `,
};
