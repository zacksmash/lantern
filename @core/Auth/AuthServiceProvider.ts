import { ContainerTokens } from "@core/Application/ContainerTokens";
import { AuthManager } from "@core/Auth/AuthManager";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";

export class AuthServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.AuthManager, () => {
			const config = globalThis.config?.("auth");
			return new AuthManager(config);
		});
	}
}
