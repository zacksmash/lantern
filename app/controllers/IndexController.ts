import type { HttpRequest } from "@core/Http/Request";
import { HttpResponse } from "@core/Http/Response";

export class IndexController {
	async invoke(request: HttpRequest) {
		return HttpResponse.json({
			message: "Welcome to Lantern!",
		});
	}
}
