import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class HandleCors implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		const response = await next(request);

		if (response instanceof Response) {
			response.headers.set("Access-Control-Allow-Origin", "*");
			response.headers.set(
				"Access-Control-Allow-Headers",
				request.header("access-control-request-headers") ?? "*",
			);
			response.headers.set(
				"Access-Control-Allow-Methods",
				request.header("access-control-request-method") ??
					"GET,POST,PUT,PATCH,DELETE,OPTIONS",
			);
		}

		return response;
	}
}
