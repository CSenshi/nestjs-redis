import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import type { RedisEvents, RedisStatus } from './redis.events';

export class RedisStreamClient extends ClientProxy<RedisEvents, RedisStatus> {
  async connect(): Promise<any> {
    console.log('connect');
  }

  async close() {
    console.log('close');
  }

  async dispatchEvent(packet: ReadPacket): Promise<any> {
    return console.log('event to dispatch: ', packet);
  }

  publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    console.log('message:', packet);

    // In a real-world application, the "callback" function should be executed
    // with payload sent back from the responder. Here, we'll simply simulate (5 seconds delay)
    // that response came through by passing the same "data" as we've originally passed in.
    //
    // The "isDisposed" bool on the WritePacket tells the response that no further data is
    // expected. If not sent or is false, this will simply emit data to the Observable.
    setTimeout(
      () =>
        callback({
          response: packet.data,
          isDisposed: true,
        }),
      5000,
    );

    return () => console.log('teardown');
  }

  unwrap<T = never>(): T {
    throw new Error('Method not implemented.');
  }
}
