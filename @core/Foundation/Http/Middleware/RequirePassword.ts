import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class RequirePassword implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		return next(request);
	}
}
