import type { RouteMatch } from "@core/Routing/Router";
import { type ValidationRules, Validator } from "@core/Validation/Validator";

type QueryRecord = Record<string, string | string[]>;

const methodsWithoutBody = new Set(["GET", "HEAD"]);

export class HttpRequest {
	private url: URL;
	private parsedBody: Record<string, any> | null = null;
	private routeMatch: RouteMatch | null = null;

	constructor(private raw: Request) {
		this.url = new URL(raw.url);
	}

	get method(): string {
		return this.raw.method.toUpperCase();
	}

	get urlInstance(): URL {
		return this.url;
	}

	path(): string {
		const pathname = this.url.pathname.replace(/\/+$/, "");
		return pathname === "" ? "/" : pathname;
	}

	header(name: string): string | null {
		return this.raw.headers.get(name);
	}

	headers(): Headers {
		return this.raw.headers;
	}

	query(): QueryRecord;
	query(
		key: string,
		fallback?: string | string[],
	): string | string[] | undefined;
	query(
		key?: string,
		fallback?: string | string[],
	): QueryRecord | string | string[] | undefined {
		const params: QueryRecord = {};

		for (const [k, value] of this.url.searchParams.entries()) {
			if (params[k]) {
				const existing = params[k];
				params[k] = Array.isArray(existing)
					? existing.concat(value)
					: [existing, value];
			} else {
				params[k] = value;
			}
		}

		if (typeof key === "undefined") {
			return params;
		}

		return params[key] ?? fallback;
	}

	params(): Record<string, string>;
	params(key: string, fallback?: string): string | undefined;
	params(
		key?: string,
		fallback?: string,
	): Record<string, string> | string | undefined {
		const params = this.routeMatch?.params ?? {};

		if (typeof key === "undefined") {
			return params;
		}

		return params[key] ?? fallback;
	}

	async json<T = Record<string, any>>(): Promise<T> {
		return (await this.parseBody()) as T;
	}

	async body<T = Record<string, any>>(): Promise<T> {
		return (await this.parseBody()) as T;
	}

	async all(): Promise<Record<string, any>> {
		const query = this.query() as QueryRecord;
		const body = await this.parseBody();
		return { ...query, ...body };
	}

	async input<T = any>(key: string, fallback?: T): Promise<T | undefined>;
	async input<T = Record<string, any>>(): Promise<T>;
	async input<T = any>(
		key?: string,
		fallback?: T,
	): Promise<T | Record<string, any> | undefined> {
		const payload = await this.all();

		if (typeof key === "undefined") {
			return payload as T;
		}

		return (payload[key] as T | undefined) ?? fallback;
	}

	async validate(rules: ValidationRules): Promise<Record<string, any>> {
		const data = await this.all();
		return Validator.validate(data, rules);
	}

	getRawRequest(): Request {
		return this.raw;
	}

	assignRouteMatch(match: RouteMatch | null) {
		this.routeMatch = match;
	}

	getRouteMatch(): RouteMatch | null {
		return this.routeMatch;
	}

	route() {
		return this.routeMatch?.route ?? null;
	}

	private async parseBody(): Promise<Record<string, any>> {
		if (this.parsedBody) return this.parsedBody;

		if (methodsWithoutBody.has(this.method)) {
			this.parsedBody = {};
			return this.parsedBody;
		}

		const contentType = this.raw.headers.get("content-type") ?? "";

		try {
			if (contentType.includes("application/json")) {
				const text = await this.raw.clone().text();
				this.parsedBody = text ? JSON.parse(text) : {};
			} else if (contentType.includes("application/x-www-form-urlencoded")) {
				const text = await this.raw.clone().text();
				const params = new URLSearchParams(text);
				this.parsedBody = Object.fromEntries(params.entries());
			} else if (contentType.includes("multipart/form-data")) {
				const formData = await this.raw.clone().formData();
				const result: Record<string, any> = {};

				for (const [key, value] of formData.entries()) {
					if (value instanceof File) {
						result[key] = value;
					} else if (result[key]) {
						const existing = result[key];
						result[key] = Array.isArray(existing)
							? existing.concat(value)
							: [existing, value];
					} else {
						result[key] = value;
					}
				}

				this.parsedBody = result;
			} else {
				this.parsedBody = {};
			}
		} catch {
			this.parsedBody = {};
		}

		return this.parsedBody ?? {};
	}
}
