import type { HttpRequest } from "@core/Http/Request";
import { ResponseFactory } from "@core/Http/ResponseFactory";
import type { Router } from "@core/Routing/Router";
import type { RoutingConfiguration } from "../Configuration/Routing";
import type { HttpKernel } from "./Kernel";

export interface DefaultKernelOptions {
	appName: string;
	environment: string;
	routing: RoutingConfiguration;
	router: Router;
}

export class DefaultHttpKernel implements HttpKernel {
	private readonly healthPath: string;

	constructor(private readonly options: DefaultKernelOptions) {
		this.healthPath = options.routing.health ?? "/up";
	}

	async handle(request: HttpRequest): Promise<Response> {
		const url = request.url;

		if (this.isHealthCheck(url.pathname)) {
			return ResponseFactory.prepare("OK");
		}

		const responseValue = await this.options.router.dispatch(request);

		return ResponseFactory.prepare(responseValue);
	}

	private isHealthCheck(pathname: string): boolean {
		return pathname === this.healthPath;
	}
}
