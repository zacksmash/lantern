import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class EnsureEmailIsVerified implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		return next(request);
	}
}
