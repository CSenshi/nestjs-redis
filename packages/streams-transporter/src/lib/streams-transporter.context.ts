import { BaseRpcContext } from '@nestjs/microservices';

type RedisStreamsContextArgs = [string, string, string, string];

/**
 * @publicApi
 */
export class RedisStreamsContext extends BaseRpcContext<RedisStreamsContextArgs> {
  constructor(args: RedisStreamsContextArgs) {
    super(args);
  }

  getStreamName() {
    return this.args[0];
  }

  getMessageId() {
    return this.args[1];
  }

  getConsumerGroup() {
    return this.args[2];
  }

  getConsumerName() {
    return this.args[3];
  }
}
