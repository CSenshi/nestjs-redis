import { firstValueFrom } from 'rxjs';
import { RedisStreamClient } from './streams-transporter.client';
import { RedisStreamServer } from './streams-transporter.server';

describe('RedisStreamsTransporter - Request/Response Integration', () => {
  let client: RedisStreamClient;
  let server: RedisStreamServer;
  const database = 3;

  beforeEach(async () => {
    client = new RedisStreamClient({ database });
    await client.connect();
    server = new RedisStreamServer({ database });
    await server.listen(() => 0);
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    if (server) {
      await server.close();
    }
  });

  it('should publish and receive a response', async () => {
    server.addHandler('user.echo', async (data) => ({ ok: true, data }), false);
    await new Promise<void>((resolve, reject) => {
      server.listen((err) => (err ? reject(err) : resolve()));
    });

    const response = await firstValueFrom(client.send('user.echo', { id: 1 }));

    expect(response).toEqual({ ok: true, data: { id: 1 } });
  });

  it('should receive errors from server', async () => {
    server.addHandler(
      'user.fail',
      async () => {
        throw new Error('boom');
      },
      false,
    );
    await new Promise<void>((resolve, reject) => {
      server.listen((err) => (err ? reject(err) : resolve()));
    });

    await expect(
      firstValueFrom(client.send('user.fail', { id: 1 })),
    ).rejects.toMatchObject({ message: 'boom' });
  }, 10000);

  it('should handle multiple requests with stateful handler', async () => {
    let counter = 0;
    server.addHandler(
      'user.counter',
      async () => {
        counter += 1;
        return `Hello ${counter}`;
      },
      false,
    );
    await new Promise<void>((resolve, reject) => {
      server.listen((err) => (err ? reject(err) : resolve()));
    });

    const res1 = await firstValueFrom(client.send('user.counter', {}));
    const res2 = await firstValueFrom(client.send('user.counter', {}));
    const res3 = await firstValueFrom(client.send('user.counter', {}));

    expect(res1).toBe('Hello 1');
    expect(res2).toBe('Hello 2');
    expect(res3).toBe('Hello 3');
  });
});
