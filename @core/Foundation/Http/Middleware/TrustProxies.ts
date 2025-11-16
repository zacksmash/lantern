import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class TrustProxies implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Proxy trusting is not yet implemented. Placeholder for future logic.
		return next(request);
	}
}
