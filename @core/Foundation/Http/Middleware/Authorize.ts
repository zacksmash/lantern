import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class Authorize implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Authorization checks pending implementation.
		return next(request);
	}
}
