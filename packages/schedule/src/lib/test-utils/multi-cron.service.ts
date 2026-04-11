import { Injectable } from '@nestjs/common';
import { Cron } from '../decorators/cron.decorator.js';
import { CronExpression } from '../enums/cron-expression.enum.js';

@Injectable()
export class MultiCronService {
  everySecondCount = 0;
  everyTwoSecondsCount = 0;

  @Cron(CronExpression.EVERY_SECOND, { name: 'multi-every-second' })
  handleEverySecond() {
    this.everySecondCount++;
  }

  @Cron('*/2 * * * * *', { name: 'multi-every-two-seconds' })
  handleEveryTwoSeconds() {
    this.everyTwoSecondsCount++;
  }
}
