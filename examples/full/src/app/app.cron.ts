import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs-redis/schedule';

@Injectable()
export class AppCron {
  private logger = new Logger(AppCron.name);

  @Cron(CronExpression.EVERY_SECOND)
  handleCron() {
    this.logger.debug('Testing cron job every second');
  }
}
