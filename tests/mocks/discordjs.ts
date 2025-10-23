import { RequestData, RouteLike } from "discord.js";

export enum DiscrodRESTMockVerb {
  get = "get",
  delete = "delete",
  post = "post",
  put = "put",
  patch = "patch",
}

export type RESTMockRegisterOPtions = {
  verb: DiscrodRESTMockVerb;
  fullRoute: RouteLike;
};

export class DiscrodRESTMock {
  private static results: Map<string, unknown> = new Map();

  private static resultkey(verb: DiscrodRESTMockVerb, fullRoute: RouteLike) {
    return `${verb} ${fullRoute}`;
  }
  public static register(
    { verb, fullRoute }: RESTMockRegisterOPtions,
    result: unknown,
  ) {
    const key = DiscrodRESTMock.resultkey(verb, fullRoute);
    if (this.results.has(key)) {
      throw Error("register existing result");
    }
    this.results.set(key, result);
  }

  public static clear() {
    this.results.clear();
  }

  public static unregister({ verb, fullRoute }: RESTMockRegisterOPtions) {
    const key = DiscrodRESTMock.resultkey(verb, fullRoute);
    this.results.delete(key);
  }

  private request(
    verb: DiscrodRESTMockVerb,
    fullRoute: RouteLike,
    options?: RequestData,
  ) {
    const key = DiscrodRESTMock.resultkey(verb, fullRoute);
    if (!DiscrodRESTMock.results.has(key)) {
      throw Error("no existing result");
    }
    return Promise.resolve(DiscrodRESTMock.results.get(key));
  }

  setToken() {
    return this;
  }

  get(fullRoute: RouteLike, options?: RequestData): Promise<unknown> {
    const verb = DiscrodRESTMockVerb.get;
    return this.request(verb, fullRoute, options);
  }
  delete(fullRoute: RouteLike, options?: RequestData): Promise<unknown> {
    const verb = DiscrodRESTMockVerb.delete;
    return this.request(verb, fullRoute, options);
  }
  post(fullRoute: RouteLike, options?: RequestData): Promise<unknown> {
    const verb = DiscrodRESTMockVerb.post;
    return this.request(verb, fullRoute, options);
  }
  put(fullRoute: RouteLike, options?: RequestData): Promise<unknown> {
    const verb = DiscrodRESTMockVerb.put;
    return this.request(verb, fullRoute, options);
  }
  patch(fullRoute: RouteLike, options?: RequestData): Promise<unknown> {
    const verb = DiscrodRESTMockVerb.patch;
    return this.request(verb, fullRoute, options);
  }
}
