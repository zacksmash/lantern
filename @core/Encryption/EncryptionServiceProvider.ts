import { ContainerTokens } from "@core/Application/ContainerTokens";
import { Encrypter } from "@core/Encryption/Encrypter";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";

export class EncryptionServiceProvider extends ServiceProvider {
	override register() {
		this.container.singleton(ContainerTokens.Encrypter, () => {
			const secret =
				globalThis.env?.("APP_KEY", "") ?? process.env.APP_KEY ?? "";

			if (!secret) {
				console.warn(
					"[Encryption] APP_KEY is not set. Falling back to a non-secure default key.",
				);
			}

			return new Encrypter(secret || "lantern-development-key");
		});
	}
}
