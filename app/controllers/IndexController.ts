import type { HttpRequest } from "@core/Http/Request";
import { optional } from "@core/Inertia/Inertia";

export class IndexController {
	async invoke(_request: HttpRequest): Promise<Response> {
		return inertia("Index", {
			title: "Lantern",
			message: "Welcome to your new framework!",
			deferred: optional(() => "This is deferred data!"),
		});
	}
}
