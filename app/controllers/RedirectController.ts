import type { HttpRequest } from "@core/Http/Request";

export class RedirectController {
	async invoke(_request: HttpRequest): Promise<Response> {
		return Response.redirect(route("index"));
	}
}
