import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { RouteParameters, UrlGenerator } from "@core/Routing/UrlGenerator";
import { app } from "@root/bootstrap/app";

export const URL = (): UrlGenerator => {
	return app.resolve(ContainerTokens.UrlGenerator);
};

export const route = (
	name: string,
	parameters?: RouteParameters,
	absolute?: boolean,
) => URL().route(name, parameters, absolute);
