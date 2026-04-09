import { RedisPollLoop, CronJobEntry } from './redis-poll-loop.service.js';
import { RedisJobStore } from './redis-job-store.service.js';

const makeStore = (): jest.Mocked<
  Pick<RedisJobStore, 'peekNextJob' | 'claimDueJob' | 'enqueueJob'>
> => ({
  peekNextJob: jest.fn(),
  claimDueJob: jest.fn(),
  enqueueJob: jest.fn(),
});

describe('RedisPollLoop', () => {
  let loop: RedisPollLoop;
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    loop = new RedisPollLoop(store as unknown as RedisJobStore);
  });

  afterEach(async () => {
    await loop.stop(100);
  });

  it('calls handler after claiming a due job', async () => {
    const handler = jest.fn();
    const entry: CronJobEntry = {
      name: 'testJob',
      expression: '* * * * * *',
      threshold: 250,
      handler,
    };
    loop.registerJob(entry);

    const now = Date.now();
    store.peekNextJob.mockResolvedValueOnce({ name: 'testJob', score: now - 10 });
    store.claimDueJob.mockResolvedValueOnce('testJob');
    store.enqueueJob.mockResolvedValue(undefined);
    store.peekNextJob.mockResolvedValue(null);

    loop.start();
    await new Promise((r) => setTimeout(r, 100));
    await loop.stop(200);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('re-enqueues BEFORE dispatching handler', async () => {
    const callOrder: string[] = [];
    const entry: CronJobEntry = {
      name: 'orderJob',
      expression: '* * * * * *',
      threshold: 250,
      handler: () => {
        callOrder.push('handler');
      },
    };
    loop.registerJob(entry);

    const now = Date.now();
    store.peekNextJob.mockResolvedValueOnce({ name: 'orderJob', score: now - 5 });
    store.enqueueJob.mockImplementation(async () => {
      callOrder.push('enqueue');
    });
    store.claimDueJob.mockResolvedValueOnce('orderJob');
    store.peekNextJob.mockResolvedValue(null);

    loop.start();
    await new Promise((r) => setTimeout(r, 150));
    await loop.stop(200);

    expect(callOrder[0]).toBe('enqueue');
    expect(callOrder[1]).toBe('handler');
  });

  it('skips handler when job is claimed beyond threshold', async () => {
    const handler = jest.fn();
    const entry: CronJobEntry = {
      name: 'lateJob',
      expression: '* * * * * *',
      threshold: 100,
      handler,
    };
    loop.registerJob(entry);

    const overdueScore = Date.now() - 500;
    store.peekNextJob.mockResolvedValueOnce({ name: 'lateJob', score: overdueScore });
    store.claimDueJob.mockResolvedValueOnce('lateJob');
    store.enqueueJob.mockResolvedValue(undefined);
    store.peekNextJob.mockResolvedValue(null);

    loop.start();
    await new Promise((r) => setTimeout(r, 100));
    await loop.stop(200);

    expect(handler).not.toHaveBeenCalled();
    expect(store.enqueueJob).toHaveBeenCalled();
  });

  it('sleeps when no jobs are due', async () => {
    store.peekNextJob.mockResolvedValue(null);
    loop.start();
    await new Promise((r) => setTimeout(r, 50));
    const callCount = store.peekNextJob.mock.calls.length;
    expect(callCount).toBeLessThan(5);
    await loop.stop(200);
  });

  it('loops immediately when claim returns null (race condition)', async () => {
    store.peekNextJob
      .mockResolvedValueOnce({ name: 'job', score: Date.now() - 10 })
      .mockResolvedValue(null);
    store.claimDueJob.mockResolvedValueOnce(null);

    loop.start();
    await new Promise((r) => setTimeout(r, 100));
    await loop.stop(200);

    expect(store.claimDueJob).toHaveBeenCalledTimes(1);
  });
});
