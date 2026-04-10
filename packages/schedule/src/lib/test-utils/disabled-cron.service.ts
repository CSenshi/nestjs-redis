import { Injectable } from '@nestjs/common';
import { Cron } from '../decorators/cron.decorator.js';
import { CronExpression } from '../enums/cron-expression.enum.js';

@Injectable()
export class DisabledCronService {
  callCount = 0;

  @Cron(CronExpression.EVERY_SECOND, { name: 'disabled-job', disabled: true })
  handle() {
    this.callCount++;
  }
}
