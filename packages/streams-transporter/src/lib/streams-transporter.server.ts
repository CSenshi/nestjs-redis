import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { type RedisClientType, createClient } from 'redis';
import { RedisEvents, RedisStatus } from './redis.events';

export class RedisStreamServer
  extends Server<RedisEvents, RedisStatus>
  implements CustomTransportStrategy
{
  private client: RedisClientType | null = null;

  async connect(): Promise<any> {
    this.client = createClient();
    this.registerEventListeners();

    await this.client.connect();
  }

  private registerEventListeners(): void {
    if (!this.client) return;

    this.client.on('error', (err) => this.logger.error(err));

    this.client.on('connect', () => {
      this._status$.next(RedisStatus.CONNECT);
    });
    this.client.on('ready', () => {
      this._status$.next(RedisStatus.CONNECTED);
    });
    this.client.on('reconnecting', () => {
      this._status$.next(RedisStatus.RECONNECTING);
    });
    this.client.on('end', () => {
      this._status$.next(RedisStatus.DISCONNECTED);
    });
  }

  /**
   * Triggered on application shutdown.
   */
  async close() {
    if (this.client) await this.client.quit();
    this.client = null;
  }

  /**
   * Triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    callback();
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to register event listeners. Most custom implementations
   * will not need this.
   */
  on<
    EventKey extends keyof RedisEvents = keyof RedisEvents,
    EventCallback extends RedisEvents[EventKey] = RedisEvents[EventKey],
  >(event: EventKey, callback: EventCallback): void {
    throw new Error('Method not implemented.' + event + callback);
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to retrieve the underlying native server. Most custom implementations
   * will not need this.
   */
  unwrap<T = RedisClientType>(): T {
    if (!this.client) {
      throw new Error(
        'Redis client is not initialized. Make sure to call "connect()" first.',
      );
    }

    return this.client as unknown as T;
  }
}
