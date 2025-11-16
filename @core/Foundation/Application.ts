import { env, envBoolean } from "@core/Support/env";
import type { RoutingConfiguration } from "./Configuration/Routing";
import { DefaultHttpKernel } from "./Http/DefaultHttpKernel";
import { HttpRequest } from "./Http/Request";
import { Exceptions } from "./Http/Exceptions";
import type { HttpKernel } from "./Http/Kernel";
import { type MiddleWare, MiddlewareManager } from "./Http/Middleware";

export interface ApplicationOptions {
	basePath: string;
	appName?: string;
	environment?: string;
	debug?: boolean;
}

export type MiddlewareConfigurator = (manager: MiddleWare) => void;
export type ExceptionConfigurator = (manager: Exceptions) => void;
export type KernelFactory = (app: Application) => HttpKernel;

export class Application {
	private readonly appName: string;
	private readonly environment: string;
	private readonly debug: boolean;
	private readonly basePath: string;

	private routingConfiguration: RoutingConfiguration = {};
	private kernelFactory?: KernelFactory;
	private kernel: HttpKernel | null = null;
	private readonly middlewareManager = new MiddlewareManager();
	private readonly exceptions: Exceptions;

	constructor(options: ApplicationOptions | string) {
		if (typeof options === "string") {
			this.basePath = options;
			this.appName = env("APP_NAME", "Lantern");
			this.environment = env("APP_ENV", "production");
			this.debug = envBoolean("APP_DEBUG", false);
		} else {
			this.basePath = options.basePath;
			this.appName = options.appName ?? env("APP_NAME", "Lantern");
			this.environment = options.environment ?? env("APP_ENV", "production");
			this.debug =
				typeof options.debug === "boolean"
					? options.debug
					: envBoolean("APP_DEBUG", false);
		}

		this.exceptions = new Exceptions({
			environment: this.environment,
			debug: this.debug,
		});
	}

	getBasePath(): string {
		return this.basePath;
	}

	getName(): string {
		return this.appName;
	}

	getEnvironment(): string {
		return this.environment;
	}

	isDebug(): boolean {
		return this.debug;
	}

	withRouting(configuration: RoutingConfiguration): this {
		this.routingConfiguration = configuration;
		return this;
	}

	withMiddleware(configure: MiddlewareConfigurator): this {
		configure(this.middlewareManager);
		return this;
	}

	withExceptions(configure: ExceptionConfigurator): this {
		configure(this.exceptions);
		return this;
	}

	useKernel(factory: KernelFactory): this {
		this.kernelFactory = factory;
		return this;
	}

	create(): this {
		this.kernel =
			this.kernelFactory?.(this) ??
			new DefaultHttpKernel({
				appName: this.appName,
				environment: this.environment,
				routing: this.routingConfiguration,
				middleware: this.middlewareManager.snapshot(),
			});

		return this;
	}

	captureRequest(request: Request): HttpRequest {
		return HttpRequest.capture(request);
	}

	async dispatch(request: HttpRequest): Promise<Response> {
		const kernel = this.ensureKernel();

		try {
			return await kernel.handle(request);
		} catch (error) {
			return this.handleError(error, request);
		}
	}

	async terminate(request: HttpRequest, response: Response): Promise<void> {
		const kernel = this.ensureKernel();

		if (typeof kernel.terminate === "function") {
			await kernel.terminate(request, response);
		}
	}

	async handleRequest(request: Request): Promise<Response> {
		const httpRequest = this.captureRequest(request);
		const response = await this.dispatch(httpRequest);
		await this.terminate(httpRequest, response);

		return response;
	}

	async handleError(error: unknown, request?: HttpRequest): Promise<Response> {
		await this.exceptions.reportAll(error, request);
		const rendered = await this.exceptions.renderFor(error, request);

		if (rendered) {
			return rendered;
		}

		return this.fallbackResponse(error);
	}

	private fallbackResponse(error: unknown): Response {
		if (this.debug) {
			const payload = {
				message: "Internal Server Error",
				error: this.normalizeError(error),
				app: this.appName,
				environment: this.environment,
			};

			return new Response(JSON.stringify(payload, null, 2), {
				status: 500,
				headers: {
					"content-type": "application/json",
				},
			});
		}

		return new Response("Internal Server Error", {
			status: 500,
			headers: {
				"content-type": "text/plain",
			},
		});
	}

	private normalizeError(error: unknown): Record<string, unknown> {
		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
				stack: error.stack,
			};
		}

		return {
			name: "Error",
			message: typeof error === "string" ? error : JSON.stringify(error),
		};
	}

	private ensureKernel(): HttpKernel {
		if (!this.kernel) {
			throw new Error(
				"Application has not been bootstrapped. Call create() first.",
			);
		}

		return this.kernel;
	}
}
