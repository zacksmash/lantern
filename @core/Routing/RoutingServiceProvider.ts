import { ContainerTokens } from "@core/Application/ContainerTokens";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { Router } from "@core/Routing/Router";
import { UrlGenerator } from "@core/Routing/UrlGenerator";

export class RoutingServiceProvider extends ServiceProvider {
	override register(): void {
		this.app.singleton(ContainerTokens.Router, () => {
			return new Router(this.container);
		});

		this.app.singleton(ContainerTokens.UrlGenerator, () => {
			const router = this.app.resolve(ContainerTokens.Router);
			const baseUrl = env("APP_URL", "http://localhost:3000");
			return new UrlGenerator(router, baseUrl);
		});
	}

	override boot(): void {
		import("@root/routes");
	}
}
