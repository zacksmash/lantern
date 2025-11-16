import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class ValidatePostSize implements MiddlewareContract {
	constructor(private readonly maxBytes = Number.MAX_SAFE_INTEGER) {}

	async handle(request: HttpRequest, next: MiddlewareNext) {
		const contentLengthHeader = request.header("content-length");
		if (contentLengthHeader) {
			const contentLength = Number(contentLengthHeader);
			if (!Number.isNaN(contentLength) && contentLength > this.maxBytes) {
				return new Response("Payload Too Large", { status: 413 });
			}
		}

		return next(request);
	}
}
