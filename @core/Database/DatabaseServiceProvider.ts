import { ContainerTokens } from "@core/Application/ContainerTokens";
import { DatabaseManager } from "@core/Database/DatabaseManager";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";

export class DatabaseServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.DatabaseManager, () => {
			const config = globalThis.config?.("database");
			return new DatabaseManager(config);
		});
	}
}
