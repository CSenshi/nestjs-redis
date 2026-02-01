import type { RedisClientOptions } from 'redis';

export interface RedisStreamsOptions extends RedisClientOptions {
  streamPrefix?: string;
  consumerGroup?: string;
  consumerName?: string;
  blockTimeout?: number;
  batchSize?: number;
  replyStreamTTL?: number;
  maxStreamLength?: number;
  retryDelay?: number;
}

export const REDIS_STREAMS_DEFAULT_OPTIONS: Required<
  Pick<
    RedisStreamsOptions,
    | 'streamPrefix'
    | 'consumerGroup'
    | 'consumerName'
    | 'blockTimeout'
    | 'batchSize'
    | 'maxStreamLength'
    | 'retryDelay'
  >
> = {
  streamPrefix: '_microservices',
  consumerGroup: 'nestjs-streams',
  consumerName: '',
  blockTimeout: 100,
  batchSize: 50,
  maxStreamLength: 10000,
  retryDelay: 250,
};

export type RedisStreamsResolvedOptions = RedisStreamsOptions &
  Required<
    Pick<RedisStreamsOptions, keyof typeof REDIS_STREAMS_DEFAULT_OPTIONS>
  >;

export const resolveRedisStreamsOptions = (
  options: RedisStreamsOptions = {},
): RedisStreamsResolvedOptions => ({
  ...options,
  ...REDIS_STREAMS_DEFAULT_OPTIONS,
  streamPrefix:
    options.streamPrefix ?? REDIS_STREAMS_DEFAULT_OPTIONS.streamPrefix,
  consumerGroup:
    options.consumerGroup ?? REDIS_STREAMS_DEFAULT_OPTIONS.consumerGroup,
  consumerName:
    options.consumerName ?? REDIS_STREAMS_DEFAULT_OPTIONS.consumerName,
  blockTimeout:
    options.blockTimeout ?? REDIS_STREAMS_DEFAULT_OPTIONS.blockTimeout,
  batchSize: options.batchSize ?? REDIS_STREAMS_DEFAULT_OPTIONS.batchSize,
  maxStreamLength:
    options.maxStreamLength ?? REDIS_STREAMS_DEFAULT_OPTIONS.maxStreamLength,
  retryDelay: options.retryDelay ?? REDIS_STREAMS_DEFAULT_OPTIONS.retryDelay,
});
