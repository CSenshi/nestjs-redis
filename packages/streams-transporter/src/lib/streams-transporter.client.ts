import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { RedisClientType, createClient } from 'redis';
import { type RedisEvents, RedisStatus } from './redis.events';

export class RedisStreamClient extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(RedisStreamClient.name);
  private client: RedisClientType | null = null;
  protected connectionPromise: Promise<any> | null = null;

  constructor() {
    super();
    this.initializeSerializer({});
    this.initializeDeserializer({});
  }

  async connect(): Promise<any> {
    if (this.client) {
      return this.connectionPromise;
    }

    this.client = createClient();
    this.registerEventListeners();

    this.connectionPromise = this.client.connect();

    await this.connectionPromise;
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
    if (this.client) await this.client.quit();
    this.client = null;
  }

  async dispatchEvent(packet: ReadPacket): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const pattern = this.normalizePattern(packet.pattern);
    const streamName = this.getRequestPattern(pattern);
    const serializedPacket = this.serializer.serialize(packet);

    await this.client.xAdd(streamName, '*', {
      data: JSON.stringify(serializedPacket),
    });
  }

  publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    console.log('message:', packet);

    // In a real-world application, the "callback" function should be executed
    // with payload sent back from the responder. Here, we'll simply simulate (5 seconds delay)
    // that response came through by passing the same "data" as we've originally passed in.
    //
    // The "isDisposed" bool on the WritePacket tells the response that no further data is
    // expected. If not sent or is false, this will simply emit data to the Observable.
    setTimeout(
      () =>
        callback({
          response: packet.data,
          isDisposed: true,
        }),
      5000,
    );
  }

  public getRequestPattern(pattern: string): string {
    return `_microservices:${pattern}`;
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
