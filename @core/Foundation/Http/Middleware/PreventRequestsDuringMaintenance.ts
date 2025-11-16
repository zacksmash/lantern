import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class PreventRequestsDuringMaintenance implements MiddlewareContract {
	async handle(request: HttpRequest, next: MiddlewareNext) {
		// Placeholder: maintenance mode toggle not yet implemented.
		return next(request);
	}
}
