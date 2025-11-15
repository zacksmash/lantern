import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export class TrimStrings implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const body = await request.body<Record<string, unknown>>();
		this.trimValue(body);
		this.trimSearchParams(request.urlInstance.searchParams);

		return next();
	}

	private trimValue(value: unknown): unknown {
		if (typeof value === "string") {
			return value.trim();
		}

		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				value[i] = this.trimValue(value[i]);
			}
			return value;
		}

		if (this.isPlainObject(value)) {
			for (const [key, nested] of Object.entries(value)) {
				(value as Record<string, unknown>)[key] = this.trimValue(nested);
			}
		}

		return value;
	}

	private trimSearchParams(params: URLSearchParams) {
		const snapshot = new Map<string, string[]>();
		for (const [key, value] of params.entries()) {
			const existing = snapshot.get(key) ?? [];
			existing.push(value);
			snapshot.set(key, existing);
		}

		for (const key of snapshot.keys()) {
			params.delete(key);
		}

		for (const [key, values] of snapshot.entries()) {
			for (const value of values) {
				params.append(key, value.trim());
			}
		}
	}

	private isPlainObject(value: unknown): value is Record<string, unknown> {
		if (value === null || typeof value !== "object") {
			return false;
		}

		if (value instanceof Date || value instanceof File) {
			return false;
		}

		return Object.getPrototypeOf(value) === Object.prototype;
	}
}
