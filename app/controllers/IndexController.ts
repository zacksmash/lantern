import { response } from "@core/Support/helpers";

export class IndexController {
	async invoke() {
		return response().json({
			message: "Welcome to Lantern!",
		});
	}
}
