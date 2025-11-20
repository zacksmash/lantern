import { AsyncLocalStorage } from "node:async_hooks";
import type { HttpRequest } from "@core/Http/Request";
import { response as responseBuilder } from "@core/Http/Response";
import { Route } from "./Facades/Route";

const requestStorage = new AsyncLocalStorage<HttpRequest>();

export const response = responseBuilder;

export const request = (): HttpRequest => {
	const current = requestStorage.getStore();
	if (!current) {
		throw new Error("No current request is available.");
	}

	return current;
};

export const runWithRequest = async <T>(
	req: HttpRequest,
	callback: () => Promise<T> | T,
): Promise<T> => {
	return await requestStorage.run(req, callback);
};

export const route = (
	name: string,
	parameters: Record<string, unknown> = {},
	absolute = true,
): string => {
	const origin = requestStorage.getStore()?.url?.origin;
	const resolvedParams = origin
		? {
				...parameters,
				__origin: parameters.__origin ?? origin,
			}
		: parameters;

	return Route.toUrl(name, resolvedParams, absolute);
};
