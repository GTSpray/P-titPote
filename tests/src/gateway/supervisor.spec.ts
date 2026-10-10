import { EventEmitter } from 'events';
import { GatewaySocket } from '../../../src/gateway/GatewaySocket.js';
import { GWSEvent } from '../../../src/gateway/gatewaytypes.js';
import { superviseGateway } from '../../../src/gateway/supervisor.js';
import { logger } from '../../../src/logger.js';

describe('superviseGateway', () => {
  let gateway: GatewaySocket;
  let exit: ReturnType<typeof vi.fn>;
  let notify: ReturnType<typeof vi.fn>;
  let signals: EventEmitter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    gateway = new GatewaySocket('fakeToken');
    vi.spyOn(gateway, 'destroy').mockResolvedValue();
    exit = vi.fn();
    notify = vi.fn().mockResolvedValue(undefined);
    signals = new EventEmitter();
    superviseGateway(gateway, { exit, notify, signals: signals as any });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies the owner then exits with an error on a fatal close', async () => {
    gateway.emit(GWSEvent.Fatal, 0, { code: 4004, reason: 'invalid token' });
    await vi.advanceTimersByTimeAsync(0);

    expect(logger.error).toHaveBeenCalledWith(
      'gateway fatal close, exiting',
      expect.objectContaining({ code: 4004 }),
    );
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('4004'));
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('still exits when the notification hangs', async () => {
    notify.mockReturnValue(new Promise(() => {}));
    gateway.emit(GWSEvent.Fatal, 0, { code: 4004, reason: 'invalid token' });

    await vi.advanceTimersByTimeAsync(4000);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('still exits when the notification fails', async () => {
    notify.mockRejectedValue(new Error('discord down'));
    gateway.emit(GWSEvent.Fatal, 0, { code: 4004, reason: 'invalid token' });
    await vi.advanceTimersByTimeAsync(0);

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it.each(['SIGTERM', 'SIGINT'])(
    'closes the gateway then exits cleanly on %s',
    async (signal) => {
      signals.emit(signal, signal);
      await vi.advanceTimersByTimeAsync(0);

      expect(gateway.destroy).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    },
  );

  it('exits even when the gateway does not close in time', async () => {
    vi.spyOn(gateway, 'destroy').mockReturnValue(new Promise(() => {}));
    signals.emit('SIGTERM', 'SIGTERM');

    await vi.advanceTimersByTimeAsync(6000);

    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('only leaves once', async () => {
    signals.emit('SIGTERM', 'SIGTERM');
    gateway.emit(GWSEvent.Fatal, 0, { code: 4004, reason: 'late' });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(exit).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
  });
});
