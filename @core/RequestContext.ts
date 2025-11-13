import { AsyncLocalStorage } from "node:async_hooks";

export class RequestContext {
	private static storage = new AsyncLocalStorage<Request>();

	static run(request: Request, callback: () => any) {
		return RequestContext.storage.run(request, callback);
	}

	static get(): Request | undefined {
		return RequestContext.storage.getStore();
	}
}
