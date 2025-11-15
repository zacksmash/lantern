import { ContainerTokens } from "@core/Application/ContainerTokens";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { MasonManager } from "@core/Mason/MasonManager";
import { setMasonResolver } from "@core/Mason/Resolver";

export class MasonServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.MasonManager, () => {
			const database = this.container.resolve(ContainerTokens.DatabaseManager);
			return new MasonManager(database);
		});

		setMasonResolver(() =>
			this.container.resolve(ContainerTokens.MasonManager),
		);
	}
}
