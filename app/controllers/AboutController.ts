// @ts-nocheck
// biome-ignore-all lint: This is a controller file
import type { HttpRequest } from "@core/Http/Request";

export class AboutController {
	async invoke(_request: HttpRequest): Promise<Response> {
		return inertia("About", {
			title: "About",
			message: "About us!",
		});
	}
}
