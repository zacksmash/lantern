import { LoggerMiddleware } from "@core/Http/Middleware/LoggerMiddleware";
import type { MiddlewareIdentifier } from "@core/Routing/Route";

export interface MiddlewareConfiguration {
	global: MiddlewareIdentifier[];
	groups: Record<string, MiddlewareIdentifier[]>;
	aliases: Record<string, MiddlewareIdentifier>;
}

export const MiddlewareConfig: MiddlewareConfiguration = {
	global: [LoggerMiddleware],
	groups: {
		web: ["logger"],
		api: [],
	},
	aliases: {
		logger: LoggerMiddleware,
	},
};
