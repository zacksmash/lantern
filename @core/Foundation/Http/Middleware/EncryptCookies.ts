import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class EncryptCookies implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Cookie encryption pending implementation; pass-through for now.
		return next(request);
	}
}
