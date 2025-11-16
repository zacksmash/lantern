import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class SubstituteBindings implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Route model binding pending routing implementation.
		return next(request);
	}
}
