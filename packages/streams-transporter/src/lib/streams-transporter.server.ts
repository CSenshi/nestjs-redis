import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { type RedisClientType, createClient } from 'redis';
import { firstValueFrom } from 'rxjs';
import { RedisEvents, RedisStatus } from './redis.events';
import { RedisStreamsContext } from './streams-transporter.context';
import {
  RedisStreamsOptions,
  RedisStreamsResolvedOptions,
  resolveRedisStreamsOptions,
} from './streams-transporter.options';
import { isEventPacket, isRequestPacket } from './types';

export class RedisStreamServer
  extends Server<RedisEvents, RedisStatus>
  implements CustomTransportStrategy
{
  private client: RedisClientType | ReturnType<typeof createClient> | null =
    null;
  private isConsuming = false;
  private consumePromise: Promise<void> | null = null;
  private lastIds = new Map<string, string>();
  private consumerGroup = '';
  private consumerName = `consumer-${process.pid}`;
  public override transportId = Symbol('REDIS_STREAMS');
  private readonly options: RedisStreamsResolvedOptions;

  constructor(options: RedisStreamsOptions = {}) {
    super();
    this.options = resolveRedisStreamsOptions(options);
    this.consumerGroup = this.options.consumerGroup;
    this.consumerName = this.options.consumerName || `consumer-${process.pid}`;
    this.initializeSerializer({});
    this.initializeDeserializer({});
  }

  async connect(): Promise<void> {
    this.client = createClient(this.options);
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
      await this.createConsumerGroup(streamName);
    }

    if (!this.isConsuming) {
      this.isConsuming = true;
      this.consumePromise = this.consumeMessages();
    }
  }

  private async createConsumerGroup(streamName: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.xGroupCreate(streamName, this.consumerGroup, '$', {
        MKSTREAM: true,
      });
    } catch (error) {
      if (!(error as Error)?.message?.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  private async consumeMessages(): Promise<void> {
    if (!this.client) return;

    while (this.isConsuming && this.client) {
      const streams = Array.from(this.lastIds.keys()).map((key) => ({
        key,
        id: '>' as const,
      }));
      if (streams.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      type XReadGroupResult =
        | {
            name: string;
            messages: Array<{ id: string; message: Record<string, string> }>;
          }[]
        | null;

      try {
        const result = (await this.client.xReadGroup(
          this.consumerGroup,
          this.consumerName,
          streams,
          {
            BLOCK: this.options.blockTimeout,
            COUNT: this.options.batchSize,
          },
        )) as XReadGroupResult;

        if (!result) {
          continue;
        }

        for (const streamData of result) {
          for (const message of streamData.messages) {
            await this.handleStreamMessage(
              streamData.name,
              message.id,
              message.message,
            );
          }
        }
      } catch (error) {
        if (this.isConsuming) {
          this.logger.error(error);
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.retryDelay),
          );
        }
      }
    }
  }

  private async handleStreamMessage(
    streamName: string,
    messageId: string,
    rawMessage: Record<string, string>,
  ): Promise<void> {
    try {
      const pattern = streamName.replace(`${this.options.streamPrefix}:`, '');
      const data = this.parseMessage(rawMessage.data);
      const context = new RedisStreamsContext([
        streamName,
        messageId,
        this.consumerGroup,
        this.consumerName,
      ]);

      if (isRequestPacket(rawMessage)) {
        await this.handleRequest(pattern, data, rawMessage, context);
        return;
      }

      if (isEventPacket(rawMessage)) {
        this.onProcessingStartHook(
          this.transportId,
          context,
          async () => void 0,
        );
        try {
          await this.handleEvent(pattern, { pattern, data }, context);
        } finally {
          this.onProcessingEndHook?.(this.transportId, context);
        }
      }
    } finally {
      await this.acknowledgeMessage(streamName, messageId);
    }
  }

  private async acknowledgeMessage(
    streamName: string,
    messageId: string,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.xAck(streamName, this.consumerGroup, messageId);
    } catch (error) {
      this.logger.error(error);
    }
  }

  public parseMessage(content: any): Record<string, any> {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  public getRequestPattern(pattern: string): string {
    return `${this.options.streamPrefix}:${pattern}`;
  }

  private async handleRequest(
    pattern: string,
    data: any,
    rawMessage: Record<string, string>,
    context: RedisStreamsContext,
  ): Promise<void> {
    if (!this.client) return;
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) return;

    const replyTo = rawMessage.replyTo;
    const id = rawMessage.id;
    if (!replyTo || !id) return;

    this.onProcessingStartHook?.(this.transportId, context, async () => void 0);
    try {
      const response$ = this.transformToObservable(
        await handler(data, context),
      );
      const response = await firstValueFrom(response$);
      await this.client.xAdd(
        replyTo,
        '*',
        {
          id,
          data: JSON.stringify(response),
          isDisposed: '1',
        },
        {
          TRIM: {
            strategy: 'MAXLEN',
            strategyModifier: '~',
            threshold: this.options.maxStreamLength,
          },
        },
      );
    } catch (error) {
      await this.client.xAdd(
        replyTo,
        '*',
        {
          id,
          err: JSON.stringify(
            error instanceof Error
              ? { message: error.message, name: error.name }
              : error,
          ),
          isDisposed: '1',
        },
        {
          TRIM: {
            strategy: 'MAXLEN',
            strategyModifier: '~',
            threshold: this.options.maxStreamLength,
          },
        },
      );
    } finally {
      this.onProcessingEndHook?.(this.transportId, context);
    }
  }
}
