import type { HttpRequest } from "@core/Http/Request";

export class IndexController {
	async invoke(_request: HttpRequest): Promise<Response> {
		return inertia("Index", {
			title: "Lantern",
			message: "Welcome to your new framework!",
		});
	}
}
