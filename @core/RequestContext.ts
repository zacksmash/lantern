import { AsyncLocalStorage } from "async_hooks";

export class RequestContext {
  private static storage = new AsyncLocalStorage<Request>();

  static run(request: Request, callback: () => any) {
    return this.storage.run(request, callback);
  }

  static get(): Request | undefined {
    return this.storage.getStore();
  }
}
