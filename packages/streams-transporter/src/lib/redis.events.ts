import type { RedisClientType } from 'redis';

type VoidCallback = (client: RedisClientType) => void;
type OnErrorCallback = (client: RedisClientType, error: Error) => void;
type OnWarningCallback = (client: RedisClientType, warning: any) => void;

export declare const enum RedisStatus {
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  CONNECTED = 'connected',
}
export declare const enum RedisEventsMap {
  CONNECT = 'connect',
  READY = 'ready',
  ERROR = 'error',
  CLOSE = 'close',
  RECONNECTING = 'reconnecting',
  END = 'end',
  WARNING = 'warning',
}
/**
 * Redis events map for the Redis client.
 * Key is the event name and value is the corresponding callback function.
 * @publicApi
 */
export type RedisEvents = {
  connect: VoidCallback;
  ready: VoidCallback;
  error: OnErrorCallback;
  close: VoidCallback;
  reconnecting: VoidCallback;
  end: VoidCallback;
  warning: OnWarningCallback;
};
export {};
