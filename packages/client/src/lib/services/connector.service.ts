import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '../decorators';
import { type Redis } from '../types';


@Injectable()
export class ConnectorService implements OnModuleInit, OnModuleDestroy {
	constructor(@InjectRedis() private readonly redisClient: Redis) { }

	async onModuleInit() {
		await this.redisClient.connect();
	}

	async onModuleDestroy() {
		await this.redisClient.quit();
	}
}
