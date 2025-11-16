import { ContainerTokens } from "@core/Application/ContainerTokens";
import { Container, type FactoryLike, type Token } from "@core/Container";
import type { ProviderConstructor } from "@core/Foundation/ServiceProvider";
import { Providers } from "@core/Foundation/ServiceProvidersManifest";
import type { HttpRequest } from "@core/Http/Request";
import { MiddlewareBuilder } from "@core/Http/Middleware/MiddlewareBuilder";
import type { Router } from "@core/Routing/Router";

export class Application {
	router!: Router;
	private basePath: string = "";
	private container: Container;
	private middlewareConfigurators: Array<
		(builder: MiddlewareBuilder) => void
	> = [];

	private providersRegistered = false;
	private providersBooted = false;
	private loadedProviders: ProviderConstructor[] = Providers;
	private serviceProviders: InstanceType<ProviderConstructor>[] = [];

	constructor() {
		this.container = new Container();
		this.container.instance(Container, this.container);
	}

	getBasePath(): string {
		return this.basePath;
	}

	async handleRequest(request: HttpRequest): Promise<Response> {
		const router = this.resolve(ContainerTokens.Router);
		return router.dispatch(request);
	}

	async configure(basePath: string): Promise<this> {
		this.basePath = basePath;
		this.container.instance(ContainerTokens.App, this);
		this.container.instance(Application, this);

		this.configureMiddleware();
		await this.registerProviders();
		await this.bootProviders();
		this.router = this.resolve(ContainerTokens.Router);

		return this;
	}

	create(): Application {
		return this;
	}

	singleton<T>(key: Token<T>, resolver: FactoryLike<T>) {
		this.container.singleton(key, resolver);
	}

	bind<T>(key: Token<T>, resolver: FactoryLike<T>) {
		this.container.bind(key, resolver);
	}

	instance<T>(key: Token<T>, value: T) {
		this.container.instance(key, value);
	}

	resolve<T>(key: Token<T>): T {
		return this.container.resolve(key);
	}

	withMiddleware(callback: (builder: MiddlewareBuilder) => void): this {
		this.middlewareConfigurators.push(callback);
		return this;
	}

	getContainer(): Container {
		return this.container;
	}

	private configureMiddleware() {
		if (this.middlewareConfigurators.length === 0) {
			return;
		}

		const builder = new MiddlewareBuilder();

		for (const configurator of this.middlewareConfigurators) {
			configurator(builder);
		}
	}

	private async registerProviders() {
		if (this.providersRegistered) return;

		this.serviceProviders = this.loadedProviders.map(
			(ProviderClass) => new ProviderClass(this),
		);

		for (const provider of this.serviceProviders) {
			await Promise.resolve(provider.register());
		}

		this.providersRegistered = true;
	}

	private async bootProviders() {
		if (this.providersBooted) return;

		for (const provider of this.serviceProviders) {
			await Promise.resolve(provider.boot());
		}

		this.providersBooted = true;
	}
}
