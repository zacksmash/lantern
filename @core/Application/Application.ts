import { ContainerTokens } from "@core/Application/ContainerTokens";
import { Container, type Token } from "@core/Container";
import type { ProviderConstructor } from "@core/Foundation/ServiceProvider";
import { Providers } from "@core/Foundation/ServiceProvidersManifest";
import type { HttpRequest } from "@core/Http/Request";
import type { Router } from "@core/Routing/Router";

export class Application {
	router!: Router;
	private basePath: string = "";
	private container: Container;

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
		const router = this.resolve(ContainerTokens.Router) as Router;

		return router.dispatch(request);
	}

	async configure(basePath: string): Promise<this> {
		this.basePath = basePath;
		this.container.instance(ContainerTokens.App, this);
		this.container.instance(Application, this);

		await this.registerProviders();
		await this.bootProviders();
		this.router = this.resolve(ContainerTokens.Router) as Router;

		return this;
	}

	create(): Application {
		return this;
	}

	singleton(key: Token, resolver: any) {
		this.container.singleton(key, resolver);
	}

	bind(key: Token, resolver: any) {
		this.container.bind(key, resolver);
	}

	instance(key: Token, value: any) {
		this.container.instance(key, value);
	}

	resolve<T = any>(key: Token<T>): T {
		return this.container.resolve(key);
	}

	getContainer(): Container {
		return this.container;
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
