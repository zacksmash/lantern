import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { UrlGenerator } from "@core/Routing/UrlGenerator";
import { app } from "@root/bootstrap/app";

export const URL = (): UrlGenerator => {
	return app.resolve(ContainerTokens.UrlGenerator) as UrlGenerator;
};

export const route = (
	name: string,
	parameters?: Record<string, any>,
	absolute?: boolean,
) => URL().route(name, parameters, absolute);
