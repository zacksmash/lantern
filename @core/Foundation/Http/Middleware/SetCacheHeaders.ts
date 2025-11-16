import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class SetCacheHeaders implements MiddlewareContract {
	async handle(
		request: HttpRequest,
		next: MiddlewareNext,
		...parameters: string[]
	) {
		const response = await next(request);

		if (response instanceof Response) {
			const [maxAge = "0"] = parameters;
			response.headers.set(
				"Cache-Control",
				`max-age=${maxAge}, must-revalidate`,
			);
		}

		return response;
	}
}
