import { AsyncLocalStorage } from 'node:async_hooks';

export const RequestContext = new AsyncLocalStorage<Request>();

export function request(): Request | undefined {
	return RequestContext.getStore();
}
