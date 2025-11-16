import type { HttpRequest } from "@core/Http/Request";
import {
	ResponseFactory,
	type ResponseValue,
} from "@core/Http/ResponseFactory";
import type { RoutingConfiguration } from "../Configuration/Routing";
import type { HttpKernel } from "./Kernel";
import type {
	MiddlewareIdentifier,
	MiddlewareResolver,
	MiddlewareSnapshot,
} from "./Middleware";
import { MiddlewarePipeline } from "./Middleware/Pipeline";

export interface DefaultKernelOptions {
	appName: string;
	environment: string;
	routing: RoutingConfiguration;
	middleware: MiddlewareSnapshot;
	resolveMiddleware: MiddlewareResolver;
}

export class DefaultHttpKernel implements HttpKernel {
	private readonly healthPath: string;
	private readonly pipeline: MiddlewarePipeline;

	constructor(private readonly options: DefaultKernelOptions) {
		this.healthPath = options.routing.health ?? "/up";
		this.pipeline = new MiddlewarePipeline(
			options.resolveMiddleware,
			options.middleware.aliases,
		);
	}

	async handle(request: HttpRequest): Promise<Response> {
		const url = request.url;

		if (this.isHealthCheck(url.pathname)) {
			return ResponseFactory.prepare("OK");
		}

		const stack = this.composeStack(url.pathname);
		const responseValue = await this.pipeline.handle(
			stack,
			request,
			async (req) => this.runningResponse(req.url.pathname),
		);

		return ResponseFactory.prepare(responseValue);
	}

	private isHealthCheck(pathname: string): boolean {
		return pathname === this.healthPath;
	}

	private composeStack(pathname: string): MiddlewareIdentifier[] {
		const group = this.detectGroup(pathname);
		return [
			...this.options.middleware.global,
			...(this.options.middleware.groups[group] ?? []),
		];
	}

	private detectGroup(pathname: string): string {
		return pathname.startsWith("/api") ? "api" : "web";
	}

	private runningResponse(pathname: string): ResponseValue {
		return {
			message: `${this.options.appName} is running`,
			environment: this.options.environment,
			path: pathname,
		};
	}
}
