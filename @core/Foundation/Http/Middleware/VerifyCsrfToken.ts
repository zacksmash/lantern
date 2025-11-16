import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class VerifyCsrfToken implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// CSRF protection pending implementation.
		return next(request);
	}
}
