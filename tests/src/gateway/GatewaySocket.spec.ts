import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { GatewaySocket } from '../../../src/gateway/GatewaySocket.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { ShardSocket } from '../../../src/gateway/ShardSocket.js';
import * as ShardSocketModule from '../../../src/gateway/ShardSocket.js';
import { MockInstance } from 'vitest';
import { logger } from '../../../src/logger.js';

class FakeShardSocket extends ShardSocket {}
vi.mock('../../../src/gateway/ShardSocket.js');

describe('GatewaySocket', () => {
  const fakeToken = 'fake token';
  let gateway: GatewaySocket;

  beforeEach(() => {
    gateway = new GatewaySocket(fakeToken);
  });
  it('should instance', () => {
    expect(gateway).toBeTruthy();
  });

  describe('connect', () => {
    const fakeUrl = 'wss://gateway.discord.gg';
    const fakeshards = 1;

    let shardSocketOpenSpy: MockInstance<() => Promise<void>>;
    let shardSocketDestroySpy: MockInstance<() => Promise<void>>;

    beforeEach(() => {
      shardSocketOpenSpy = vi
        .spyOn(ShardSocket.prototype, 'open')
        .mockResolvedValue();

      shardSocketDestroySpy = vi
        .spyOn(ShardSocket.prototype, 'destroy')
        .mockResolvedValue();

      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.gatewayBot(),
        },
        {
          url: fakeUrl,
          session_start_limit: {
            max_concurrency: 1,
            remaining: 973,
            reset_after: 74572774,
            total: 1000,
          },
          shards: fakeshards,
        },
      );
    });

    it('should call discord api to determine websocket url and recomended shards', async () => {
      const getSpy = vi.spyOn(REST.prototype, 'get');
      await gateway.connect();

      expect(getSpy).toHaveBeenCalledWith(Routes.gatewayBot());
      expect(gateway.url).toBe(fakeUrl);
      expect(gateway.shards).toBe(fakeshards);
    });

    it('should create one ShardSocket for each shard', async () => {
      const ShardSocketConstructor = vi
        .spyOn(ShardSocketModule, 'ShardSocket')
        .mockImplementationOnce(FakeShardSocket);
      await gateway.connect();
      expect(ShardSocketConstructor).toHaveBeenCalledWith(gateway, 0);
    });

    it('should open created ShardSocket', async () => {
      await gateway.connect();
      expect(shardSocketOpenSpy).toHaveBeenCalledWith();
    });

    it('should destroy previous created ShardSocket', async () => {
      await gateway.connect();
      await gateway.connect();
      expect(shardSocketDestroySpy).toHaveBeenCalledWith();
    });
  });

  describe('connect with session start limit', () => {
    const register = (session_start_limit: object, shards: number) =>
      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.gatewayBot(),
        },
        { url: 'wss://gateway.discord.gg', session_start_limit, shards },
      );

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(ShardSocket.prototype, 'open').mockResolvedValue();
      vi.spyOn(ShardSocket.prototype, 'destroy').mockResolvedValue();
    });

    it('logs the remaining session starts', async () => {
      register({ max_concurrency: 1, remaining: 973, total: 1000 }, 1);

      await gateway.connect();

      expect(logger.info).toHaveBeenCalledWith(
        'gateway session start limit',
        expect.anything(),
      );
    });

    it('logs an error when few session starts remain', async () => {
      register({ max_concurrency: 1, remaining: 12, total: 1000 }, 1);

      await gateway.connect();

      expect(logger.error).toHaveBeenCalledWith(
        'gateway session start limit',
        expect.anything(),
      );
    });

    it('starts shards by bucket of max_concurrency, 5s apart', async () => {
      vi.useFakeTimers();
      const openSpy = vi.spyOn(ShardSocket.prototype, 'open');
      register({ max_concurrency: 2, remaining: 900, total: 1000 }, 5);

      const connected = gateway.connect();
      await vi.advanceTimersByTimeAsync(100);
      expect(openSpy).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5000);
      expect(openSpy).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(5000);
      expect(openSpy).toHaveBeenCalledTimes(5);
      await connected;
      vi.useRealTimers();
    });

    it('rejects when a shard fails to open', async () => {
      register({ max_concurrency: 1, remaining: 900, total: 1000 }, 1);
      vi.spyOn(ShardSocket.prototype, 'open').mockRejectedValue(
        new Error('open failed'),
      );

      await expect(gateway.connect()).rejects.toThrow('open failed');
    });
  });

  describe('destroy', () => {
    it('destroys every shard socket once', async () => {
      vi.spyOn(ShardSocket.prototype, 'open').mockResolvedValue();
      const destroySpy = vi
        .spyOn(ShardSocket.prototype, 'destroy')
        .mockResolvedValue();
      DiscrodRESTMock.register(
        { verb: DiscrodRESTMockVerb.get, fullRoute: Routes.gatewayBot() },
        {
          url: 'wss://gateway.discord.gg',
          session_start_limit: { max_concurrency: 5, remaining: 900 },
          shards: 2,
        },
      );
      await gateway.connect();

      await gateway.destroy();
      await gateway.destroy();

      expect(destroySpy).toHaveBeenCalledTimes(2);
    });

    it('does not fail when a shard cannot be destroyed', async () => {
      vi.spyOn(ShardSocket.prototype, 'open').mockResolvedValue();
      vi.spyOn(ShardSocket.prototype, 'destroy').mockRejectedValue(
        new Error('boom'),
      );
      DiscrodRESTMock.register(
        { verb: DiscrodRESTMockVerb.get, fullRoute: Routes.gatewayBot() },
        {
          url: 'wss://gateway.discord.gg',
          session_start_limit: { max_concurrency: 1, remaining: 900 },
          shards: 1,
        },
      );
      await gateway.connect();

      await expect(gateway.destroy()).resolves.toBeUndefined();
    });
  });

  describe('send', () => {
    let shardSocketOpenSpy: MockInstance<(data: object) => void>;
    beforeEach(async () => {
      vi.spyOn(ShardSocket.prototype, 'open').mockResolvedValue();

      shardSocketOpenSpy = vi.spyOn(ShardSocket.prototype, 'send');

      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.gatewayBot(),
        },
        {
          url: 'wss://gateway.discord.gg',
          session_start_limit: {
            max_concurrency: 1,
            remaining: 973,
            reset_after: 74572774,
            total: 1000,
          },
          shards: 1,
        },
      );

      await gateway.connect();
    });

    it('should call ShardSocket.send', () => {
      const d = { data: 'fake payload ' };
      gateway.send(d);

      expect(shardSocketOpenSpy).toHaveBeenCalledWith(d);
    });
  });
});
