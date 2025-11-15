import type { Authenticatable } from "@core/Auth/Contracts";
import { CookieJar } from "@core/Http/Cookie/CookieJar";
import type { RouteMatch } from "@core/Routing/Router";
import type { Session } from "@core/Session/Session";
import { type ValidationRules, Validator } from "@core/Validation/Validator";

type QueryRecord = Record<string, string | string[]>;
type PayloadRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is PayloadRecord => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const methodsWithoutBody = new Set(["GET", "HEAD"]);

interface ProxyOverrides {
	scheme?: string;
	host?: string;
	port?: string;
	prefix?: string;
}

export class HttpRequest {
	private url: URL;
	private parsedBody: PayloadRecord | null = null;
	private routeMatch: RouteMatch | null = null;
	private cookieJar: CookieJar;
	private sessionInstance: Session | null = null;
	private userInstance: Authenticatable | null = null;
	private attributes = new Map<string, unknown>();

	constructor(private raw: Request) {
		this.url = new URL(raw.url);
		this.cookieJar = new CookieJar(raw.headers.get("cookie"));
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

	async json<T = PayloadRecord>(): Promise<T> {
		return (await this.parseBody()) as T;
	}

	async body<T = PayloadRecord>(): Promise<T> {
		return (await this.parseBody()) as T;
	}

	async all(): Promise<PayloadRecord> {
		const query = this.query() as QueryRecord;
		const body = await this.parseBody();
		return { ...query, ...body };
	}

	async input<T = unknown>(key: string, fallback?: T): Promise<T | undefined>;
	async input<T extends PayloadRecord = PayloadRecord>(): Promise<T>;
	async input<T = unknown>(
		key?: string,
		fallback?: T,
	): Promise<T | PayloadRecord | undefined> {
		const payload = await this.all();

		if (typeof key === "undefined") {
			return payload as T;
		}

		return (payload[key] as T | undefined) ?? fallback;
	}

	async validate(rules: ValidationRules): Promise<Record<string, unknown>> {
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

	cookies(): CookieJar {
		return this.cookieJar;
	}

	setSession(session: Session | null) {
		this.sessionInstance = session;
	}

	session(): Session | null {
		return this.sessionInstance;
	}

	setUser(user: Authenticatable | null) {
		this.userInstance = user;
	}

	user<T extends Authenticatable = Authenticatable>(): T | null {
		return (this.userInstance as T) ?? null;
	}

	setAttribute(key: string, value: unknown) {
		this.attributes.set(key, value);
	}

	getAttribute<T = unknown>(key: string): T | undefined {
		return this.attributes.get(key) as T | undefined;
	}

	applyProxyOverrides(overrides: ProxyOverrides) {
		const hasOverrides = Boolean(
			overrides.scheme || overrides.host || overrides.port || overrides.prefix,
		);

		if (!hasOverrides) {
			return;
		}

		const updated = new URL(this.url.toString());

		if (overrides.scheme) {
			const normalized = overrides.scheme.replace(/:$/, "");
			updated.protocol = `${normalized}:`;
		}

		if (overrides.host) {
			if (overrides.host.includes(":")) {
				updated.host = overrides.host;
			} else {
				updated.hostname = overrides.host;
			}
		}

		if (overrides.port) {
			updated.port = overrides.port;
		}

		if (overrides.prefix) {
			const prefix = overrides.prefix.startsWith("/")
				? overrides.prefix
				: `/${overrides.prefix}`;
			const normalizedPrefix = prefix.replace(/\/+$/, "");
			if (normalizedPrefix && !updated.pathname.startsWith(normalizedPrefix)) {
				const combined = `${normalizedPrefix}/${updated.pathname}`
					.replace(/\/{2,}/g, "/")
					.replace(/\/+$/, "");
				updated.pathname = combined.startsWith("/") ? combined : `/${combined}`;
			}
		}

		this.url = updated;
	}

	private async parseBody(): Promise<PayloadRecord> {
		if (this.parsedBody) return this.parsedBody;

		if (methodsWithoutBody.has(this.method)) {
			this.parsedBody = {};
			return this.parsedBody;
		}

		const contentType = this.raw.headers.get("content-type") ?? "";

		try {
			if (contentType.includes("application/json")) {
				const text = await this.raw.clone().text();
				if (!text) {
					this.parsedBody = {};
				} else {
					const parsed = JSON.parse(text);
					this.parsedBody = isRecord(parsed) ? parsed : {};
				}
			} else if (contentType.includes("application/x-www-form-urlencoded")) {
				const text = await this.raw.clone().text();
				const params = new URLSearchParams(text);
				this.parsedBody = Object.fromEntries(params.entries()) as PayloadRecord;
			} else if (contentType.includes("multipart/form-data")) {
				const formData = await this.raw.clone().formData();
				const result: PayloadRecord = {};

				for (const [key, value] of formData.entries()) {
					const existing = result[key];
					if (typeof existing !== "undefined") {
						const values = Array.isArray(existing)
							? existing.slice()
							: [existing];
						values.push(value);
						result[key] = values;
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
