import type { HttpRequest } from "@core/Http/Request";
import { SessionGuard } from "@core/Support/Auth/SessionGuard";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class RedirectIfAuthenticated implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		const guard = new SessionGuard();
		const user = await guard.user(request);
		if (user) {
			return new Response("Redirecting", {
				status: 302,
				headers: { location: "/" },
			});
		}

		return next(request);
	}
}
