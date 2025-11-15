import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { CacheManager } from "@core/Cache/CacheManager";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { SessionManager } from "@core/Session/SessionManager";

export class SessionServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.SessionManager, () => {
			const cache = this.container.resolve<CacheManager>(
				ContainerTokens.CacheManager,
			);
			const config = globalThis.config?.("session");
			return new SessionManager(cache, config);
		});
	}
}
