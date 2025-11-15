import type { HttpRequest } from "@core/Http/Request";

export interface Middleware {
	handle(
		request: HttpRequest,
		next: () => Promise<Response>,
	): Promise<Response>;
}
