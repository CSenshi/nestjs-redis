import type { INestApplication, WebSocketAdapter } from '@nestjs/common';
import type { RedisClientType } from 'redis';

export interface RedisIoAdapterInstance extends WebSocketAdapter {
  connectToRedis(redisClient: RedisClientType): Promise<void>;
  createIOServer(port: number, options?: unknown): unknown;
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

    public adapterConstructor: ReturnType<typeof createAdapter> | undefined;

    async connectToRedis(redisClient: RedisClientType): Promise<void> {
      this.pubClient = redisClient;
      this.subClient = this.pubClient.duplicate();

      await this.subClient.connect();

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    }

    override createIOServer(port: number, options?: any): any {
      const server = super.createIOServer(port, options);
      server.adapter(this.adapterConstructor);
      return server;
    }

    override async close(server: any): Promise<void> {
      super.close(server);

      if (this.subClient) {
        await this.subClient.quit();
      }
    }
  }

  return RedisIoAdapter as RedisIoAdapterConstructor;
}
