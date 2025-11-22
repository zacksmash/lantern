import type { HttpRequest } from "@core/Http/Request";
import { ResponseFactory } from "@core/Http/ResponseFactory";
import {
	clearQueuedCookies,
	queuedCookies,
	serializeCookie,
} from "@core/Support/Cookies";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class AddQueuedCookiesToResponse implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		const responseValue = await next(request);
		const response = ResponseFactory.prepare(responseValue);
		const queue = queuedCookies(request);
		if (!queue.length) {
			return response;
		}

		const headers = new Headers(response.headers);
		for (const cookie of queue) {
			headers.append(
				"set-cookie",
				serializeCookie(cookie.name, cookie.value, cookie.options),
			);
		}

		clearQueuedCookies(request);

		return new Response(response.body, { ...response, headers });
	}
}
