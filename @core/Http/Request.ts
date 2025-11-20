import { ValidationException } from "@core/Validation/ValidationException";
import { Validator } from "@core/Validation/Validator";

type PlainObject = Record<string, unknown>;

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

export interface ValidationRules {
	[key: string]: string | string[];
}

export class HttpRequest {
	private readonly urlObject: URL;
	private readonly queryParams: URLSearchParams;
	private readonly bodyDataPromise: Promise<PlainObject>;
	private bodyData?: PlainObject;
	private validatedPayload?: PlainObject;

	protected constructor(
		public readonly raw: Request,
		protected routeParameters: Record<string, unknown> = {},
	) {
		this.urlObject = new URL(raw.url);
		this.queryParams = this.urlObject.searchParams;
		this.bodyDataPromise = this.parseBody();
	}

	static capture(
		raw: Request,
		routeParameters: Record<string, string> = {},
	): HttpRequest {
		return new HttpRequest(raw, routeParameters);
	}

	get method(): string {
		return this.raw.method.toUpperCase();
	}

	get url(): URL {
		return this.urlObject;
	}

	path(): string {
		return this.urlObject.pathname;
	}

	header(name: string): string | null {
		return this.raw.headers.get(name);
	}

	headers(): Headers {
		return this.raw.headers;
	}

	ip(): string | null {
		return (
			this.raw.headers.get("x-forwarded-for") ??
			this.raw.headers.get("cf-connecting-ip") ??
			null
		);
	}

	bearerToken(): string | null {
		const header = this.header("authorization");
		if (!header) {
			return null;
		}

		const [type, token] = header.split(" ");
		if (type?.toLowerCase() !== "bearer" || !token) {
			return null;
		}

		return token;
	}

	async all(): Promise<PlainObject> {
		const body = await this.getBodyData();
		return {
			...(this.query() as PlainObject),
			...body,
		};
	}

	query(): PlainObject;
	query(key: string, defaultValue?: unknown): unknown;
	query(key?: string, defaultValue?: unknown): PlainObject | unknown {
		if (typeof key === "undefined") {
			return Object.fromEntries(this.queryParams.entries()) as PlainObject;
		}

		return this.queryParams.get(key) ?? defaultValue;
	}

	async input(key?: string, defaultValue?: unknown): Promise<unknown> {
		const data = await this.all();
		if (!key) {
			return data;
		}

		return (data[key] ?? defaultValue) as unknown;
	}

	async only(keys: string[]): Promise<PlainObject> {
		const data = await this.all();
		return keys.reduce<PlainObject>((carry, key) => {
			if (key in data) {
				carry[key] = data[key]!;
			}
			return carry;
		}, {});
	}

	async except(keys: string[]): Promise<PlainObject> {
		const data = await this.all();
		const blacklist = new Set(keys);
		return Object.keys(data).reduce<PlainObject>((carry, key) => {
			if (!blacklist.has(key)) {
				carry[key] = data[key]!;
			}
			return carry;
		}, {});
	}

	async merge(values: PlainObject): Promise<void> {
		const body = await this.getBodyData();
		Object.assign(body, values);
		this.bodyData = body;
	}

	route(): Record<string, unknown>;
	route<T = unknown>(key: string, defaultValue?: T): T | undefined;
	route<T = unknown>(
		key?: string,
		defaultValue?: T,
	): Record<string, unknown> | T | undefined {
		if (typeof key === "undefined") {
			return { ...this.routeParameters };
		}

		return (this.routeParameters[key] ?? defaultValue) as T | undefined;
	}

	async validate<T extends PlainObject>(rules: ValidationRules): Promise<T> {
		const data = await this.all();
		const validator = new Validator(data, rules);
		const result = validator.validate();

		if (!result.valid) {
			throw new ValidationException(
				"The given data was invalid.",
				result.errors,
			);
		}

		this.validatedPayload = result.data;
		return result.data as T;
	}

	validated<T = PlainObject>(): T {
		if (!this.validatedPayload) {
			throw new ValidationException(
				"No validated data is present. Call validate() first.",
				{},
			);
		}

		return this.validatedPayload as T;
	}

	setRouteParameters(parameters: Record<string, unknown>): void {
		this.routeParameters = { ...parameters };
	}

	wantsJson(): boolean {
		const header = this.header("accept") ?? "";
		return header.includes("application/json");
	}

	private async getBodyData(): Promise<PlainObject> {
		if (this.bodyData) {
			return this.bodyData;
		}

		this.bodyData = await this.bodyDataPromise;
		return this.bodyData;
	}

	private async parseBody(): Promise<PlainObject> {
		if (BODYLESS_METHODS.has(this.method)) {
			return {};
		}

		const contentType = this.header("content-type") ?? "";
		const cloned = this.raw.clone();

		try {
			if (contentType.includes("application/json")) {
				const parsed = await cloned.json();
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
					return parsed as PlainObject;
				}
				return {};
			}

			if (contentType.includes("application/x-www-form-urlencoded")) {
				const form = await cloned.formData();
				const result: PlainObject = {};
				for (const [key, value] of form.entries()) {
					if (typeof value === "string") {
						result[key] = value;
					}
				}

				return result;
			}

			if (contentType.includes("multipart/form-data")) {
				const form = await cloned.formData();
				const result: PlainObject = {};
				for (const [key, value] of form.entries()) {
					result[key] = value;
				}

				return result;
			}

			if (contentType.includes("text/plain")) {
				return { body: await cloned.text() };
			}
		} catch {
			return {};
		}

		return {};
	}
}
