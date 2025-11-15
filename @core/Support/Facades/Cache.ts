import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { CacheManager } from "@core/Cache/CacheManager";
import { app } from "@root/bootstrap/app";

export const cache = (): CacheManager => {
	return app.resolve(ContainerTokens.CacheManager);
};

export const Cache = cache;
