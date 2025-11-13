import type { Middleware } from "@core/Foundation/Middleware";

export class LoggerMiddleware implements Middleware {
	async handle(request: Request, next: () => Promise<Response>) {
		console.log(
			`[${new Date().toISOString()}] ${request.method} ${request.url}`,
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
