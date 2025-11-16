import type { HttpRequest } from "@core/Http/Request";

export interface HttpKernel {
	handle(request: HttpRequest): Promise<Response>;
	terminate?(request: HttpRequest, response: Response): Promise<void> | void;
}
