import { getPromiseWithTimeout } from '../../../src/utils/getPromiseWithTimeout.js';

describe('getPromiseWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the executor resolves', async () => {
    const promise = getPromiseWithTimeout(
      1000,
      'timed out after %t ms',
      (resolve) => {
        resolve('ok');
      },
    );

    await expect(promise).resolves.toBe('ok');
  });

  it('rejects when the timeout elapses', async () => {
    const promise = getPromiseWithTimeout(
      100,
      'timed out after %t ms',
      () => {},
    );

    const assertion = expect(promise).rejects.toThrow('timed out after 100 ms');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('rejects when an async executor throws', async () => {
    const promise = getPromiseWithTimeout(
      1000,
      'timed out after %t ms',
      async () => {
        throw new Error('async executor failed');
      },
    );

    await expect(promise).rejects.toThrow('async executor failed');
  });
});
