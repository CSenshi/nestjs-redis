import { Injectable } from '@nestjs/common';
import { Cron } from '../decorators/cron.decorator.js';
import { CronExpression } from '../enums/cron-expression.enum.js';

@Injectable()
export class TestService {
  callCount = 0;

  @Cron(CronExpression.EVERY_SECOND, { name: 'test-job' })
  handle() {
    this.callCount++;
  }
}
