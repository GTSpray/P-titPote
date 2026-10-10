import { connectWithRetry } from '../../../src/gateway/connectWithRetry.js';
import { logger } from '../../../src/logger.js';

describe('connectWithRetry', () => {
  const wait = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    wait.mockClear();
  });

  it('connects once when everything works', async () => {
    const connect = vi.fn().mockResolvedValue(undefined);

    await connectWithRetry({ connect }, { wait });

    expect(connect).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it('retries with a growing delay until the connection succeeds', async () => {
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue(undefined);

    await connectWithRetry({ connect }, { wait, random: () => 0 });

    expect(connect).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[1000], [2000]]);
    expect(logger.error).toHaveBeenCalledWith(
      'gateway connect failed',
      expect.objectContaining({ attempt: 1 }),
    );
  });

  it('gives up with the last error after the maximum number of attempts', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('still down'));

    await expect(
      connectWithRetry({ connect }, { wait, maxAttempts: 3 }),
    ).rejects.toThrow('still down');

    expect(connect).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
