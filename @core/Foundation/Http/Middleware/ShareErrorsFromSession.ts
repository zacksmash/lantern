import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class ShareErrorsFromSession implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Flash error sharing pending session implementation.
		return next(request);
	}
}
