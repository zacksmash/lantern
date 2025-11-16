import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class AddQueuedCookiesToResponse implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Cookie queuing pending implementation.
		return next(request);
	}
}
