import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

const DEFAULT_EXCEPT: string[] = [];

export class TrimStrings implements MiddlewareContract {
	constructor(private readonly except: string[] = DEFAULT_EXCEPT) {}

	async handle(request: HttpRequest, next: MiddlewareNext) {
		const data = await request.all();
		const trimmed: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			if (this.except.includes(key) || typeof value !== "string") {
				trimmed[key] = value;
			} else {
				trimmed[key] = value.trim();
			}
		}

		await request.merge(trimmed);
		return next(request);
	}
}
