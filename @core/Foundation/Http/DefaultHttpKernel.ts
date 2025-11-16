import type { RoutingConfiguration } from "../Configuration/Routing";
import type { HttpKernel } from "./Kernel";
import type { MiddlewareSnapshot } from "./Middleware";
import type { HttpRequest } from "./Request";

export interface DefaultKernelOptions {
	appName: string;
	environment: string;
	routing: RoutingConfiguration;
	middleware: MiddlewareSnapshot;
}

export class DefaultHttpKernel implements HttpKernel {
	private readonly healthPath: string;

	constructor(private readonly options: DefaultKernelOptions) {
		this.healthPath = options.routing.health ?? "/up";
	}

	async handle(request: HttpRequest): Promise<Response> {
		const url = request.url;

		if (this.isHealthCheck(url.pathname)) {
			return this.healthResponse();
		}

		return this.runningResponse(url.pathname);
	}

	async terminate(): Promise<void> {
		// No-op for now; hook for future middleware termination.
	}

	private isHealthCheck(pathname: string): boolean {
		return pathname === this.healthPath;
	}

	private healthResponse(): Response {
		return new Response("OK", {
			status: 200,
			headers: {
				"content-type": "text/plain",
			},
		});
	}

	private runningResponse(pathname: string): Response {
		const payload = {
			message: `${this.options.appName} is running`,
			environment: this.options.environment,
			path: pathname,
			middleware: this.options.middleware.web,
		};

		return new Response(JSON.stringify(payload, null, 2), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	}
}
