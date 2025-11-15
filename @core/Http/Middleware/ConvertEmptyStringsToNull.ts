import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export class ConvertEmptyStringsToNull implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const body = await request.body<Record<string, unknown>>();
		this.convert(body);
		return next();
	}

	private convert(value: unknown): unknown {
		if (typeof value === "string") {
			return value === "" ? null : value;
		}

		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				value[i] = this.convert(value[i]);
			}
			return value;
		}

		if (this.isPlainObject(value)) {
			for (const [key, nested] of Object.entries(value)) {
				(value as Record<string, unknown>)[key] = this.convert(nested);
			}
		}

		return value;
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
