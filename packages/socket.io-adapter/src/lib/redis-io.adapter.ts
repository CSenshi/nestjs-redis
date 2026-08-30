import type { INestApplication, WebSocketAdapter } from '@nestjs/common';
import type { IoAdapter } from '@nestjs/platform-socket.io';
import type { RedisClientType } from 'redis';

type CreateIOServer = IoAdapter['createIOServer'];

export interface RedisIoAdapterInstance extends WebSocketAdapter {
  connectToRedis(redisClient: RedisClientType): Promise<void>;
  createIOServer(
    ...args: Parameters<CreateIOServer>
  ): ReturnType<CreateIOServer>;
}

export type RedisIoAdapterConstructor = new (
  app: INestApplication,
) => RedisIoAdapterInstance;

export async function getIoAdapterCls(): Promise<RedisIoAdapterConstructor> {
  const { IoAdapter } = await import('@nestjs/platform-socket.io');
  const { createAdapter } = await import('@socket.io/redis-adapter');

  class RedisIoAdapter extends IoAdapter implements RedisIoAdapterInstance {
    public pubClient: RedisClientType | undefined;
    public subClient: RedisClientType | undefined;

    public adapterConstructor!: ReturnType<typeof createAdapter>;

    async connectToRedis(redisClient: RedisClientType): Promise<void> {
      this.pubClient = redisClient;
      this.subClient = this.pubClient.duplicate();

      await this.subClient.connect();

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    }

    override createIOServer(
      ...args: Parameters<CreateIOServer>
    ): ReturnType<CreateIOServer> {
      const server = super.createIOServer(...args);
      server.adapter(this.adapterConstructor);
      return server;
    }

    override async close(server: object): Promise<void> {
      // IoAdapter.close expects a Socket.IO Server; keep the override loose.
      super.close(server as never);

      if (this.subClient) {
        await this.subClient.close();
      }
    }
  }

  return RedisIoAdapter as RedisIoAdapterConstructor;
}
