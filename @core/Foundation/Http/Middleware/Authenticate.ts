import type { HttpRequest } from "@core/Http/Request";
import { SessionGuard } from "@core/Support/Auth/SessionGuard";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class Authenticate implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		const guard = new SessionGuard();
		const user = await guard.user(request);

		if (!user) {
			return new Response("Unauthenticated", { status: 401 });
		}

		return next(request);
	}
}
