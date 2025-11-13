import { Container } from "@core/Container";
import { Providers } from "@core/Foundation/ServiceProvidersManifest";
import type { Router } from "@core/Routing/Router";
import type { ProviderConstructor } from "./Foundation/ServiceProvider";

export class Application {
	router: Router;
	private basePath: string = "";
	private container: Container;

	private providersBooted = false;
	private loadedProviders: ProviderConstructor[] = Providers;
	private serviceProviders: InstanceType<ProviderConstructor>[] = [];

	constructor() {
		this.container = new Container();

		this.registerProviders();

		this.router = this.resolve("router") as Router;
	}

	getBasePath(): string {
		return this.basePath;
	}

	async handleRequest(request: Request): Promise<Response> {
		const router = this.resolve("router") as Router;

		return router.dispatch(request);
	}

	configure(basePath: string): this {
		this.basePath = basePath;

		this.bootProviders();

		return this;
	}

	create(): Application {
		return this;
	}

	singleton(key: string, resolver: any) {
		this.container.singleton(key, resolver);
	}

	bind(key: string, resolver: any) {
		this.container.bind(key, resolver);
	}

	instance(key: string, value: any) {
		this.container.instance(key, value);
	}

	resolve<T = any>(key: string): T {
		return this.container.resolve(key);
	}

	getContainer(): Container {
		return this.container;
	}

	private registerProviders() {
		this.serviceProviders = this.loadedProviders.map(
			(ProviderClass) => new ProviderClass(this),
		);

		for (const provider of this.serviceProviders) {
			provider.register();
		}
	}

	private bootProviders() {
		if (this.providersBooted) return;

		for (const provider of this.serviceProviders) {
			provider.boot();
		}

		this.providersBooted = true;
	}
}
