import EventEmitter from 'events';
import { logger } from '../logger.js';

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  /**
   * Listeners are isolated from each other: one throwing listener neither
   * prevents the others from running nor bubbles up to the emitting socket.
   */
  emit<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    ...eventArg: TEvents[TEventName]
  ) {
    for (const listener of this.emitter.rawListeners(eventName)) {
      try {
        listener.apply(this.emitter, eventArg);
      } catch (error) {
        logger.error('gateway event listener failed', { eventName, error });
      }
    }
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.on(eventName, handler as any);
  }

  once<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.once(eventName, handler as any);
  }

  off<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.off(eventName, handler as any);
  }

  listenerCount<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
  ) {
    return this.emitter.listenerCount(eventName);
  }
}
