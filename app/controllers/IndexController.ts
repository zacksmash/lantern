// @ts-nocheck
// biome-ignore-all lint: This is a controller file
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

	async store(request: HttpRequest): Promise<Response> {
		const data = await request.validate({
			name: "string|required",
		});

		return inertia("Index", {
			title: "Form Submitted",
			message: `Hello, ${data.name}! Your form has been submitted successfully.`,
		});
	}
}
