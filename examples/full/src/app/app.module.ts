// app.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import {
  RedisHealthIndicator,
  RedisModule,
  RedisThrottlerStorage,
  RedisToken,
  RedlockModule,
} from '@nestjs-redis/kit';
import type { RedisClientType } from 'redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Client
    RedisModule.forRoot({
      isGlobal: true,
      options: { url: 'redis://localhost:6379' },
    }),
    RedisModule.forRoot({
      isGlobal: true,
      options: { url: 'redis://localhost:6380' },
      connectionName: 'cluster',
    }),

    // Locking
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: RedisClientType) => ({
        clients: [redis],
        redlockConfig: { retryDelayMs: 100, retryCount: 2 },
      }),
    }),

    // Throttling
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: RedisClientType) => ({
        throttlers: [{ limit: 5111, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),

    // Health checks
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [RedisHealthIndicator, AppService],
})
export class AppModule {}
