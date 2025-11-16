import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class Authenticate implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Authentication guard pending implementation.
		return next(request);
	}
}
