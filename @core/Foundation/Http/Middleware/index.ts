import { AddQueuedCookiesToResponse } from "./AddQueuedCookiesToResponse";
import { Authenticate } from "./Authenticate";
import { AuthenticateSession } from "./AuthenticateSession";
import { AuthenticateWithBasicAuth } from "./AuthenticateWithBasicAuth";
import { Authorize } from "./Authorize";
import type {
	MiddlewareFunction,
	MiddlewareIdentifier,
	MiddlewareResolver,
	MiddlewareSnapshot,
} from "./Contracts";
import { ConvertEmptyStringsToNull } from "./ConvertEmptyStringsToNull";
import { EncryptCookies } from "./EncryptCookies";
import { EnsureEmailIsVerified } from "./EnsureEmailIsVerified";
import { HandleCors } from "./HandleCors";
import { PreventRequestsDuringMaintenance } from "./PreventRequestsDuringMaintenance";
import { RedirectIfAuthenticated } from "./RedirectIfAuthenticated";
import { RequirePassword } from "./RequirePassword";
import { SetCacheHeaders } from "./SetCacheHeaders";
import { ShareErrorsFromSession } from "./ShareErrorsFromSession";
import { StartSession } from "./StartSession";
import { SubstituteBindings } from "./SubstituteBindings";
import { ThrottleRequests } from "./ThrottleRequests";
import { TrimStrings } from "./TrimStrings";
import { TrustProxies } from "./TrustProxies";
import { ValidatePostSize } from "./ValidatePostSize";
import { ValidateSignature } from "./ValidateSignature";
import { VerifyCsrfToken } from "./VerifyCsrfToken";

export type { MiddlewarePipeline } from "./Pipeline";
export type { MiddlewareSnapshot, MiddlewareIdentifier, MiddlewareResolver };
export type { MiddlewareContract, MiddlewareFunction } from "./Contracts";

const DEFAULT_GLOBAL: MiddlewareIdentifier[] = [
	TrustProxies,
	HandleCors,
	PreventRequestsDuringMaintenance,
	ValidatePostSize,
	TrimStrings,
	ConvertEmptyStringsToNull,
];

const DEFAULT_GROUPS: Record<string, MiddlewareIdentifier[]> = {
	web: [
		EncryptCookies,
		AddQueuedCookiesToResponse,
		StartSession,
		ShareErrorsFromSession,
		VerifyCsrfToken,
		SubstituteBindings,
	],
	api: [SubstituteBindings, "throttle:api"],
};

const DEFAULT_ALIASES: Record<string, MiddlewareIdentifier> = {
	auth: Authenticate,
	"auth.basic": AuthenticateWithBasicAuth,
	"auth.session": AuthenticateSession,
	"cache.headers": SetCacheHeaders,
	can: Authorize,
	guest: RedirectIfAuthenticated,
	"password.confirm": RequirePassword,
	signed: ValidateSignature,
	throttle: ThrottleRequests,
	verified: EnsureEmailIsVerified,
};

export interface CookieEncryptionConfig {
	except?: string[];
}

export interface MiddlewareStackMutation {
	append?: MiddlewareIdentifier[];
	prepend?: MiddlewareIdentifier[];
	remove?: MiddlewareIdentifier[];
	replace?: MiddlewareIdentifier[];
}

export class MiddlewareManager {
	private cookieConfig: Required<CookieEncryptionConfig> = {
		except: [],
	};

	private globalMiddleware: MiddlewareIdentifier[] = [...DEFAULT_GLOBAL];
	private groups: Record<string, MiddlewareIdentifier[]> = {
		web: [...(DEFAULT_GROUPS.web ?? [])],
		api: [...(DEFAULT_GROUPS.api ?? [])],
	};

	private groupMutations: Record<string, MiddlewareStackMutation> = {};
	private aliases: Record<string, MiddlewareIdentifier> = {
		...DEFAULT_ALIASES,
	};

	encryptCookies(config: CookieEncryptionConfig): this {
		this.cookieConfig = {
			except: Array.from(new Set(config.except ?? [])),
		};

		return this;
	}

	use(middleware: MiddlewareIdentifier[]): this {
		this.globalMiddleware = middleware;
		return this;
	}

	appendGlobal(middleware: MiddlewareIdentifier[]): this {
		this.globalMiddleware = [...this.globalMiddleware, ...middleware];
		return this;
	}

	prependGlobal(middleware: MiddlewareIdentifier[]): this {
		this.globalMiddleware = [...middleware, ...this.globalMiddleware];
		return this;
	}

	group(name: string, middleware: MiddlewareIdentifier[]): this {
		this.groups[name] = middleware;
		return this;
	}

	web(config: MiddlewareStackMutation): this {
		this.groupMutations.web = config;
		return this;
	}

	alias(name: string, middleware: MiddlewareIdentifier): this {
		this.aliases[name] = middleware;
		return this;
	}

	function(name: string, middleware: MiddlewareFunction): this {
		return this.alias(name, middleware);
	}

	snapshot(): MiddlewareSnapshot {
		const webGroup = this.groups.web ?? [];
		const apiGroup = this.groups.api ?? [];

		return {
			cookies: { ...this.cookieConfig },
			global: [...this.globalMiddleware],
			groups: {
				web: this.applyMutation(webGroup, this.groupMutations.web),
				api: this.applyMutation(apiGroup, this.groupMutations.api),
			},
			aliases: { ...this.aliases },
		};
	}

	private applyMutation(
		stack: MiddlewareIdentifier[] | undefined,
		mutation?: MiddlewareStackMutation,
	): MiddlewareIdentifier[] {
		const base = stack ?? [];

		if (!mutation) {
			return [...base];
		}

		let result = [...base];

		if (mutation.prepend?.length) {
			result = [...mutation.prepend, ...result];
		}

		if (mutation.append?.length) {
			result = [...result, ...mutation.append];
		}

		if (mutation.remove?.length) {
			const removeSet = new Set(mutation.remove);
			result = result.filter((middleware) => !removeSet.has(middleware));
		}

		if (mutation.replace?.length) {
			result = [...mutation.replace];
		}

		return result;
	}
}

export type MiddleWare = MiddlewareManager;
