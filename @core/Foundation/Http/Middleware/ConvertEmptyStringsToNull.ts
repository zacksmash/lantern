import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class ConvertEmptyStringsToNull implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		const data = await request.all();
		const converted: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			if (value === "") {
				converted[key] = null;
			} else {
				converted[key] = value;
			}
		}

		await request.merge(converted);

		return next(request);
	}
}
