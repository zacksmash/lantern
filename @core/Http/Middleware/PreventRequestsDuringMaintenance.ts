import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export class PreventRequestsDuringMaintenance implements Middleware {
	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		const maintenanceFile = Bun.file("storage/app/.maintenance");
		if (await maintenanceFile.exists()) {
			return new Response("The application is under maintenance.", {
				status: 503,
			});
		}

		return next();
	}
}
