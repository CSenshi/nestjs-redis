import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { RedisClientOptions, RedisClientType, createClient } from 'redis';
import { type RedisEvents, RedisStatus } from './redis.events';
import { isResponsePacket } from './types';
import { EventType } from './types';

export class RedisStreamClient extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(RedisStreamClient.name);
  private client: RedisClientType | ReturnType<typeof createClient> | null =
    null;
  protected connectionPromise: Promise<any> | null = null;
  private readonly clientId = `client-${randomUUID()}`;
  private replyStreamName = `_microservices:reply:${this.clientId}`;
  private isListening = false;
  private replyListenerPromise: Promise<void> | null = null;
  private readonly options: RedisClientOptions;

  constructor(options: RedisClientOptions = {}) {
    super();
    this.options = options;
    this.initializeSerializer({});
    this.initializeDeserializer({});
  }

  async connect(): Promise<any> {
    if (this.client) {
      return this.connectionPromise;
    }

    this.client = createClient(this.options);
    this.registerEventListeners();

    this.connectionPromise = this.client.connect();

    await this.connectionPromise;
    this.isListening = true;
    this.replyListenerPromise = this.listenForReplies();
    return this.connectionPromise;
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

  async close() {
    this.isListening = false;
    if (this.replyListenerPromise) {
      await this.replyListenerPromise;
    }
    if (this.client) {
      try {
        await this.client.del(this.replyStreamName);
      } catch {
        // ignore
      }
      await this.client.quit();
    }
    this.client = null;
    this.connectionPromise = null;
  }

  async dispatchEvent(packet: ReadPacket): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const pattern = this.normalizePattern(packet.pattern);
    const streamName = this.getRequestPattern(pattern);
    const serializedPacket = this.serializer.serialize(packet);

    const data: EventType = {
      e: '1',
      data: JSON.stringify(serializedPacket.data),
    };

    await this.client.xAdd(streamName, '*', data);
  }

  publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const requestPacket = this.assignPacketId(packet);
    const cleanup = () => this.routingMap.delete(requestPacket.id);

    try {
      const pattern = this.normalizePattern(requestPacket.pattern);
      const streamName = this.getRequestPattern(pattern);
      const serializedPacket = this.serializer.serialize(requestPacket);

      this.routingMap.set(requestPacket.id, callback);

      void this.client.xAdd(streamName, '*', {
        e: '0',
        id: requestPacket.id,
        replyTo: this.replyStreamName,
        data: JSON.stringify(serializedPacket.data),
      });

      return cleanup;
    } catch (err) {
      callback({ err });
      return () => void 0;
    }
  }

  public getRequestPattern(pattern: string): string {
    return `_microservices:${pattern}`;
  }

  private async listenForReplies(): Promise<void> {
    if (!this.client) return;
    let lastId = '0';

    while (this.isListening && this.client) {
      try {
        const result = await this.client.xRead(
          { key: this.replyStreamName, id: lastId },
          { BLOCK: 100, COUNT: 10 },
        );

        if (Array.isArray(result) && result.length > 0) {
          const streams = result as Array<{
            messages: Array<{ id: string; message: Record<string, string> }>;
          }>;
          for (const streamData of streams) {
            for (const message of streamData.messages) {
              lastId = message.id;
              this.handleReplyMessage(message.message);
            }
          }
        }
      } catch (err) {
        if (this.isListening) {
          this.logger.error(err);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    }
  }

  private handleReplyMessage(rawMessage: Record<string, string>): void {
    if (!isResponsePacket(rawMessage)) return;
    const id = rawMessage.id;
    const callback = this.routingMap.get(id);
    if (!callback) return;

    if (rawMessage.err) {
      this.routingMap.delete(id);
      callback({ err: this.parseMessage(rawMessage.err) });
      return;
    }

    const response =
      rawMessage.data !== undefined
        ? this.parseMessage(rawMessage.data)
        : undefined;
    const isDisposed = rawMessage.isDisposed === '1';

    callback({ response, isDisposed });
    if (isDisposed) {
      this.routingMap.delete(id);
    }
  }

  private parseMessage(content: any): any {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  unwrap<T = RedisClientType>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }

    return this.client as T;
  }
}
