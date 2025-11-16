import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class StartSession implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Session handling not implemented yet.
		return next(request);
	}
}
