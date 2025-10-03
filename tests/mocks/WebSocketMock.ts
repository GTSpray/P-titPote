import EventEmitter from "events";
import { getRandomString } from "./discord-api/utils.js";

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
      throw Error("existing mockserver");
    }

    this.on("wsmessage", (d) => {
      this.spy(d);
    });

    this.on("wsconnection", (ws) => {
      ws.readyState = 1; // WebSocket.OPEN;
    });

    this.on("wsclose", () => {
      this.emit("close", "co close", "close");
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

  emit(eventName: string, ...eventArg: any[]) {
    this.emitter.emit(eventName, ...eventArg);
  }

  send(d: string) {
    this.emitter.emit("message", d);
  }
}

export class WebSocketMock {
  public mockedServer: WebSocketServerMock;
  public readyState = 0; // WebSocket.CONNECTING;

  constructor(private url: string) {
    const [domain] = url.split("?");
    this.mockedServer = WebSocketServerMock.getInstance(domain);

    setTimeout(() => {
      this.mockedServer.emit("wsconnection", this);
    }, 20);

    this.on("close", () => {
      this.readyState = 3; // WebSocket.CLOSED
    });
  }

  on(eventName: any, handler: () => void) {
    this.mockedServer.on(eventName, handler);
  }

  once(eventName: any, handler: () => void) {
    this.mockedServer.once(eventName, handler);
  }

  send(d: string) {
    this.mockedServer.emit("wsmessage", d);
  }

  close(...args: any[]) {
    this.mockedServer.emit("wsclose", ...args);
    this.readyState = 2; // WebSocket.CLOSING
  }

  removeAllListeners() {}
}
