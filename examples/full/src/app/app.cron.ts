import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs-redis/schedule';

@Injectable()
export class AppCron {
  @Cron(CronExpression.EVERY_SECOND)
  handleCron() {
    console.log('Testing');
  }
}
