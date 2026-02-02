type VoidCallback = () => void;
type OnErrorCallback = (error: Error) => void;
type OnWarningCallback = (warning: any) => void;

export const enum RedisStatus {
  CONNECT = 'connect',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  CONNECTED = 'connected',
}

export const enum RedisEventsMap {
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
