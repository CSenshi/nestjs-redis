import { Injectable } from '@nestjs/common';
import { Redlock } from '@redis-kit/lock';

@Injectable()
export class RedlockService extends Redlock {}
