import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { RedisClientType } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: RedisClientType | undefined;
  private subClient: RedisClientType | undefined;

  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

  async connectToRedis(redisClient: RedisClientType): Promise<void> {
    this.pubClient = redisClient;
    this.subClient = this.pubClient.duplicate();

    await this.subClient.connect();

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  override createIOServer(
    port: number,
    options?: Parameters<IoAdapter['createIOServer']>[1],
  ): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  override async close(
    server: Parameters<IoAdapter['close']>[0],
  ): Promise<void> {
    super.close(server);

    if (this.subClient) {
      await this.subClient.quit();
    }
  }
}
