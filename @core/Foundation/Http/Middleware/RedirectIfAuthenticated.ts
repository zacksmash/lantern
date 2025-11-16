import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class RedirectIfAuthenticated implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		return next(request);
	}
}
