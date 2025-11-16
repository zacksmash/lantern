import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class AuthenticateWithBasicAuth implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// HTTP Basic auth pending implementation.
		return next(request);
	}
}
