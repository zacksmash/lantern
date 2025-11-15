import { AsyncLocalStorage } from "node:async_hooks";
import type { HttpRequest } from "@core/Http/Request";

export class RequestContext {
	private static storage = new AsyncLocalStorage<HttpRequest>();

	static run(request: HttpRequest, callback: () => any) {
		return RequestContext.storage.run(request, callback);
	}

	static get(): HttpRequest | undefined {
		return RequestContext.storage.getStore();
	}
}
