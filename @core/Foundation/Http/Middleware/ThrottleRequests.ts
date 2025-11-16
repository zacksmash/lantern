import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class ThrottleRequests implements MiddlewareContract {
	async handle(
		request: HttpRequest,
		next: MiddlewareNext,
		..._parameters: string[]
	) {
		// Rate limiting pending implementation.
		return next(request);
	}
}
