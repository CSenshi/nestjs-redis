import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { type RedisClientType, createClient } from 'redis';
import { RedisEvents, RedisStatus } from './redis.events';
import { isEventPacket, isRequestPacket } from './types';

export class RedisStreamServer
  extends Server<RedisEvents, RedisStatus>
  implements CustomTransportStrategy
{
  private client: RedisClientType | null = null;
  private isConsuming = false;
  private consumePromise: Promise<void> | null = null;
  private lastIds = new Map<string, string>();

  constructor() {
    super();
    this.initializeSerializer({});
    this.initializeDeserializer({});
  }

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
    this.isConsuming = false;
    if (this.consumePromise) {
      await this.consumePromise;
    }
    if (this.client) await this.client.quit();
    this.client = null;
    this.lastIds.clear();
  }

  /**
   * Triggered when you run "app.listen()".
   */
  async listen(callback: (err?: unknown) => void) {
    try {
      if (!this.client) {
        await this.connect();
      }
      await this.bindEvents();
      callback();
    } catch (err) {
      callback(err);
    }
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

  private async bindEvents(): Promise<void> {
    const patterns = Array.from(this.messageHandlers.keys());
    if (patterns.length === 0) {
      return;
    }

    for (const pattern of patterns) {
      const streamName = this.getRequestPattern(pattern);
      if (!this.lastIds.has(streamName)) {
        this.lastIds.set(streamName, '0');
      }
    }

    if (!this.isConsuming) {
      this.isConsuming = true;
      this.consumePromise = this.consumeMessages();
    }
  }

  private async consumeMessages(): Promise<void> {
    if (!this.client) return;

    while (this.isConsuming && this.client) {
      const streams = Array.from(this.lastIds.entries()).map(([key, id]) => ({
        key,
        id,
      }));
      if (streams.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      try {
        const result = await this.client.xRead(streams, {
          BLOCK: 1000,
          COUNT: 50,
        });

        if (!result) {
          continue;
        }

        for (const streamData of result) {
          for (const message of streamData.messages) {
            this.lastIds.set(streamData.name, message.id);
            await this.handleStreamMessage(streamData.name, message.message);
          }
        }
      } catch (error) {
        if (this.isConsuming) {
          this.logger.error(error);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    }
  }

  private async handleStreamMessage(
    streamName: string,
    rawMessage: Record<string, string>,
  ): Promise<void> {
    const pattern = streamName.replace('_microservices:', '');
    const data = this.parseMessage(rawMessage.data);

    if (isRequestPacket(rawMessage)) {
      return;
    }

    if (isEventPacket(rawMessage)) {
      await this.handleEvent(pattern, { pattern, data }, {});
    }
  }

  public parseMessage(content: any): Record<string, any> {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getRequestPattern(pattern: string): string {
    return `_microservices:${pattern}`;
  }
}
