import EventEmitter from 'events';
import { getRandomString } from './discord-api/utils.js';

export class WebSocketServerMock {
  static instances = new Map<string, WebSocketServerMock>();
  private emitter = new EventEmitter();
  private spy = vi.fn();
  static getInstance(url: string) {
    const s = WebSocketServerMock.instances.get(url);
    if (!s) {
      const n = new WebSocketServerMock(url);
      WebSocketServerMock.instances.set(url, n);
      return n;
    }
    return s;
  }

  static createInstance() {
    const s = () => getRandomString({ length: 8, letter: true, number: true });
    const url = `ws://test-${s()}-${s()}-${s()}.com`;
    return WebSocketServerMock.getInstance(url);
  }

  private constructor(private url: string) {
    if (WebSocketServerMock.instances.has(url)) {
      throw Error('existing mockserver');
    }

    this.on('wsmessage', (d) => {
      this.spy(d);
    });

    this.on('wsconnection', (ws, url) => {
      ws.readyState = 1; // WebSocket.OPEN;
      this.emit('open');
    });

    this.on('wsclose', (...args: any[]) => {
      const code = typeof args[0] === 'number' ? args[0] : 1000;
      const reason = args[1] ?? 'client close';
      this.emit('close', code, reason);
    });
  }

  public getUrl() {
    return this.url;
  }

  public getSpy() {
    return this.spy;
  }

  on(eventName: any, handler: (...eventArg: any[]) => void) {
    this.emitter.on(eventName, handler);
  }

  once(eventName: any, handler: (...eventArg: any[]) => void) {
    this.emitter.once(eventName, handler);
  }

  off(eventName: any, handler: (...eventArg: any[]) => void) {
    this.emitter.off(eventName, handler);
  }

  emit(eventName: string, ...eventArg: any[]) {
    this.emitter.emit(eventName, ...eventArg);
  }

  send(d: string) {
    this.emitter.emit('message', d);
  }
}

export class WebSocketMock {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  public mockedServer: WebSocketServerMock;
  public readyState = 0; // WebSocket.CONNECTING;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(private url: string) {
    const [domain] = url.split('?');
    this.mockedServer = WebSocketServerMock.getInstance(domain);

    setTimeout(() => {
      this.mockedServer.emit('wsconnection', this, url);
    }, 20);

    this.on('close', () => {
      this.readyState = 3; // WebSocket.CLOSED
    });
  }

  private track(eventName: string, handler: (...args: any[]) => void) {
    let set = this.listeners.get(eventName);
    if (!set) {
      set = new Set();
      this.listeners.set(eventName, set);
    }
    set.add(handler);
  }

  on(eventName: any, handler: (...args: any[]) => void) {
    this.track(eventName, handler);
    this.mockedServer.on(eventName, handler);
  }

  once(eventName: any, handler: (...args: any[]) => void) {
    const wrap = (...args: any[]) => {
      this.listeners.get(eventName)?.delete(wrap);
      handler(...args);
    };
    this.track(eventName, wrap);
    this.mockedServer.once(eventName, wrap);
  }

  send(d: string) {
    this.mockedServer.emit('wsmessage', d);
  }

  close(...args: any[]) {
    this.mockedServer.emit('wsclose', ...args);
    this.readyState = 2; // WebSocket.CLOSING
  }

  terminate() {
    this.readyState = 3; // WebSocket.CLOSED
    this.mockedServer.emit('wsterminate');
  }

  removeAllListeners(eventName?: string) {
    if (eventName) {
      for (const handler of this.listeners.get(eventName) ?? []) {
        this.mockedServer.off(eventName, handler);
      }
      this.listeners.delete(eventName);
      return;
    }
    for (const [name, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.mockedServer.off(name, handler);
      }
    }
    this.listeners.clear();
  }
}
