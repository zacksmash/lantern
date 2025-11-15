import { ContainerTokens } from "@core/Application/ContainerTokens";
import { CacheManager } from "@core/Cache/CacheManager";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";

export class CacheServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.CacheManager, () => {
			const config = globalThis.config?.("cache");
			return new CacheManager(config);
		});
	}
}
