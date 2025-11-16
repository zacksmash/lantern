// @ts-nocheck
// biome-ignore-all lint: This is a controller file
import type { HttpRequest } from "@core/Http/Request";

export class RedirectController {
	async invoke(_request: HttpRequest): Promise<Response> {
		return Response.redirect(route("index"));
	}
}
