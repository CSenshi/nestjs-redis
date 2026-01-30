import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import type { RedisClientType } from 'redis';
import type { RedisEvents, RedisStatus } from './redis.events';

export class RedisStreamServer
  extends Server<RedisEvents, RedisStatus>
  implements CustomTransportStrategy
{
  constructor(private readonly client: RedisClientType) {
    super();
  }

  /**
   * Triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    callback();
  }

  /**
   * Triggered on application shutdown.
   */
  async close() {
    await this.client.quit();
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to register event listeners. Most custom implementations
   * will not need this.
   */
  on<
    EventKey extends keyof RedisEvents = keyof RedisEvents,
    EC extends RedisEvents[EventKey] = RedisEvents[EventKey],
  >(event: EventKey, callback: EC): void {
    throw new Error('Method not implemented.' + event + callback);
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to retrieve the underlying native server. Most custom implementations
   * will not need this.
   */
  unwrap<T = never>(): T {
    throw new Error('Method not implemented.');
  }
}
