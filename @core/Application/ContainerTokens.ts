import type { Application } from "@core/Application/Application";
import { createToken } from "@core/Container/Tokens";
import type { Router } from "@core/Routing/Router";
import type { UrlGenerator } from "@core/Routing/UrlGenerator";

export const ContainerTokens = {
	App: createToken<Application>("app.instance"),
	Router: createToken<Router>("router"),
	UrlGenerator: createToken<UrlGenerator>("url.generator"),
};
