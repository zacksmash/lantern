import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
	request: LanternRequest;
};

const storage = new AsyncLocalStorage<RequestContext>();

export class LanternRequest {
	private readonly raw: Request;
	private cachedUrl?: URL;

	constructor(raw: Request) {
		this.raw = raw;
	}

	get method(): string {
		return this.raw.method;
	}

	get url(): string {
		return this.raw.url;
	}

	get path(): string {
		return this.urlObject.pathname;
	}

	get urlObject(): URL {
		if (!this.cachedUrl) {
			this.cachedUrl = new URL(this.raw.url);
		}

		return this.cachedUrl;
	}

	get headers(): Headers {
		return this.raw.headers;
	}

	get query(): Record<string, string | string[]> {
		const entries: Record<string, string | string[]> = {};

		for (const [key, value] of this.urlObject.searchParams.entries()) {
			if (entries[key]) {
				const existing = entries[key];
				entries[key] = Array.isArray(existing)
					? [...existing, value]
					: [existing, value];
			} else {
				entries[key] = value;
			}
		}

		return entries;
	}

	async json<T = unknown>(): Promise<T> {
		return this.raw.json() as Promise<T>;
	}

	async text(): Promise<string> {
		return this.raw.text();
	}

	async formData(): Promise<globalThis.FormData> {
		return this.raw.formData() as Promise<globalThis.FormData>;
	}

	rawRequest(): Request {
		return this.raw;
	}
}

export function useRequest(): LanternRequest {
	const ctx = storage.getStore();

	if (!ctx) {
		throw new Error("No request context is available");
	}

	return ctx.request;
}

export async function runWithRequest<T>(
	raw: Request,
	callback: (request: LanternRequest) => Promise<T> | T,
): Promise<T> {
	const request = new LanternRequest(raw);

	return storage.run({ request }, () => callback(request));
}
