import { ConvertEmptyStringsToNull } from "@core/Http/Middleware/ConvertEmptyStringsToNull";
import { HandleCors } from "@core/Http/Middleware/HandleCors";
import { LoggerMiddleware } from "@core/Http/Middleware/LoggerMiddleware";
import { PreventRequestsDuringMaintenance } from "@core/Http/Middleware/PreventRequestsDuringMaintenance";
import {
	AddQueuedCookiesToResponse,
	Authenticate,
	AuthenticateSession,
	AuthenticateWithBasic,
	Authorize,
	CacheHeaders,
	EncryptCookies,
	EnsureEmailIsVerified,
	RedirectIfAuthenticated,
	RequirePassword,
	ShareErrorsFromSession,
	StartSession,
	SubstituteBindings,
	ValidateSignature,
	VerifyCsrfToken,
} from "@core/Http/Middleware/RouteMiddleware";
import {
	ApiThrottleRequests,
	ThrottleRequests,
} from "@core/Http/Middleware/ThrottleRequests";
import { TrimStrings } from "@core/Http/Middleware/TrimStrings";
import { TrustProxies } from "@core/Http/Middleware/TrustProxies";
import { ValidatePostSize } from "@core/Http/Middleware/ValidatePostSize";
import type { MiddlewareIdentifier } from "@core/Routing/Route";

export interface MiddlewareConfiguration {
	global: MiddlewareIdentifier[];
	groups: Record<string, MiddlewareIdentifier[]>;
	aliases: Record<string, MiddlewareIdentifier>;
}

export const MiddlewareConfig: MiddlewareConfiguration = {
	global: [
		TrustProxies,
		HandleCors,
		PreventRequestsDuringMaintenance,
		ValidatePostSize,
		TrimStrings,
		ConvertEmptyStringsToNull,
	],
	groups: {
		web: [
			"EncryptCookies",
			"StartSession",
			"ShareErrorsFromSession",
			"VerifyCsrfToken",
			"SubstituteBindings",
			"AddQueuedCookiesToResponse",
		],
		api: ["SubstituteBindings", "Throttle:api"],
	},
	aliases: {
		EncryptCookies,
		AddQueuedCookiesToResponse,
		StartSession,
		ShareErrorsFromSession,
		VerifyCsrfToken,
		SubstituteBindings,
		"Throttle:api": ApiThrottleRequests,
		throttle: ThrottleRequests,
		auth: Authenticate,
		"auth.basic": AuthenticateWithBasic,
		"auth.session": AuthenticateSession,
		"cache.headers": CacheHeaders,
		can: Authorize,
		guest: RedirectIfAuthenticated,
		"password.confirm": RequirePassword,
		signed: ValidateSignature,
		verified: EnsureEmailIsVerified,
		logger: LoggerMiddleware,
	},
};
