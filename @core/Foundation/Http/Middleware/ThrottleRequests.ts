import type { HttpRequest } from "@core/Http/Request";
import { RateLimiter } from "@core/Support/RateLimiter";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class ThrottleRequests implements MiddlewareContract {
	async handle(
		request: HttpRequest,
		next: MiddlewareNext,
		..._parameters: string[]
	) {
		const key = `${request.ip() ?? "ip"}:${request.header("x-forwarded-for") ?? ""}`;
		const limiter = RateLimiter.for("global", {
			attempts: 60,
			decaySeconds: 60,
		});

		if (!(await limiter.hit(key))) {
			return new Response("Too Many Requests", { status: 429 });
		}

		return next(request);
	}
}
