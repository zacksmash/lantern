import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export class LoggerMiddleware implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		console.log(
			`[${new Date().toISOString()}] ${request.method} ${request.urlInstance.toString()}`,
		);
		const response = await next();
		console.log(
			`[${new Date().toISOString()}] Response: ${response.status} ${
				response.statusText
			}`,
		);
		return response;
	}
}
