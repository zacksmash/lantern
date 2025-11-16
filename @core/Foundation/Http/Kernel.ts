import type { HttpRequest } from "./Request";

export interface HttpKernel {
	handle(request: HttpRequest): Promise<Response>;
	terminate?(request: HttpRequest, response: Response): Promise<void> | void;
}
