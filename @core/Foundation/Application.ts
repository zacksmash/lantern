import { ConfigRepository } from "@core/Config/Repository";
import { Container, type Token } from "@core/Container/Container";
import { HttpRequest } from "@core/Http/Request";
import { env, envBoolean } from "@core/Support/env";
import providers from "@root/bootstrap/providers";
import type { RoutingConfiguration } from "./Configuration/Routing";
import { DefaultExceptionHandler } from "./Exceptions/DefaultHandler";
import type { ExceptionHandlerContract } from "./Exceptions/Handler";
import { DefaultHttpKernel } from "./Http/DefaultHttpKernel";
import { Exceptions } from "./Http/Exceptions";
import type { HttpKernel } from "./Http/Kernel";
import { type MiddleWare, MiddlewareManager } from "./Http/Middleware";
import frameworkProviders from "./Providers";
import type {
	ApplicationContract,
	ServiceProvider,
	ServiceProviderConstructor,
} from "./ServiceProvider";

type ExceptionHandlerConstructor = new () => ExceptionHandlerContract;

export interface ApplicationOptions {
	basePath: string;
	appName?: string;
	environment?: string;
	debug?: boolean;
}

export type MiddlewareConfigurator = (manager: MiddleWare) => void;
export type ExceptionConfigurator = (manager: Exceptions) => void;
export type KernelFactory = (app: Application) => HttpKernel;

export class Application implements ApplicationContract {
	private readonly appName: string;
	private readonly environment: string;
	private readonly debug: boolean;
	private readonly basePath: string;

	private routingConfiguration: RoutingConfiguration = {};
	private kernelFactory?: KernelFactory;
	private kernel: HttpKernel | null = null;
	private readonly middlewareManager = new MiddlewareManager();
	private readonly exceptions: Exceptions;
	private readonly container = new Container(this);
	private readonly configRepository: ConfigRepository;
	private providerConstructors: ServiceProviderConstructor[] = [];
	private includeBootstrapProviders = true;
	private readonly providerInstances = new Map<
		ServiceProviderConstructor,
		ServiceProvider
	>();
	private exceptionHandlerClass: ExceptionHandlerConstructor =
		DefaultExceptionHandler;
	private readonly bootingCallbacks: Array<() => void> = [];
	private readonly bootedCallbacks: Array<() => void> = [];

	constructor(options: ApplicationOptions | string) {
		const basePath = typeof options === "string" ? options : options.basePath;
		this.configRepository = new ConfigRepository(basePath);

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

	withProviders(
		providersList: ServiceProviderConstructor[],
		includeBootstrapProviders = true,
	): this {
		this.providerConstructors.push(...providersList);
		this.includeBootstrapProviders = includeBootstrapProviders;
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

	withExceptionHandler(handler: ExceptionHandlerConstructor): this {
		this.exceptionHandlerClass = handler;
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
				resolveMiddleware: (token) => this.make(token),
			});

		this.registerBaseBindings();
		this.initializeProviders();
		this.bootProviders();

		return this;
	}

	bind<T>(token: Token<T>, resolver: (app: Application) => T): this {
		this.container.bind(token, resolver);
		return this;
	}

	singleton<T>(token: Token<T>, resolver: (app: Application) => T): this {
		this.container.singleton(token, resolver);
		return this;
	}

	instance<T>(token: Token<T>, value: T): this {
		this.container.instance(token, value);
		return this;
	}

	make<T>(token: Token<T>): T {
		return this.container.make(token);
	}

	getProvider<T extends ServiceProvider>(
		provider: ServiceProviderConstructor<T>,
	): T | undefined {
		return this.providerInstances.get(provider) as T | undefined;
	}

	config<T = unknown>(key: string, defaultValue?: T): T {
		return this.configRepository.get<T>(key, defaultValue);
	}

	booting(callback: () => void): void {
		this.bootingCallbacks.push(callback);
	}

	booted(callback: () => void): void {
		this.bootedCallbacks.push(callback);
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

		const handler = this.resolveExceptionHandler();
		await handler.report(error, request);

		const handlerResponse = await handler.render(error, request);
		if (handlerResponse) {
			return handlerResponse;
		}

		const fallback = await this.exceptions.renderFor(error, request);
		if (fallback) {
			return fallback;
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

	private registerBaseBindings(): void {
		this.instance(Application, this);
		this.instance("app", this);
		this.singleton(ConfigRepository, () => this.configRepository);
		this.singleton("config", () => this.configRepository);
		if (!this.container.has(this.exceptionHandlerClass)) {
			this.singleton(
				this.exceptionHandlerClass,
				() => new this.exceptionHandlerClass(),
			);
		}
	}

	private initializeProviders(): void {
		const providerClasses: ServiceProviderConstructor[] = [
			...frameworkProviders,
			...this.providerConstructors,
			...(this.includeBootstrapProviders ? providers : []),
		];

		for (const providerClass of providerClasses) {
			if (this.providerInstances.has(providerClass)) {
				continue;
			}

			const provider = new providerClass(this);
			provider.register();
			this.providerInstances.set(providerClass, provider);
		}
	}

	private bootProviders(): void {
		for (const callback of this.bootingCallbacks) {
			callback();
		}

		for (const provider of this.providerInstances.values()) {
			provider.boot();
		}

		for (const provider of this.providerInstances.values()) {
			provider.booted();
		}

		for (const callback of this.bootedCallbacks) {
			callback();
		}
	}

	private resolveExceptionHandler(): ExceptionHandlerContract {
		return this.make(this.exceptionHandlerClass);
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
