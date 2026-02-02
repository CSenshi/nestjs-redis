// app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/client';
import { Redlock } from '@nestjs-redis/lock';
import type { RedisClientType } from 'redis';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  @Redlock(['locks:test'], 100)
  async setValue(key: string, value: string) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
