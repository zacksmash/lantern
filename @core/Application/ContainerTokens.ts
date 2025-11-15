import type { Application } from "@core/Application/Application";
import type { AuthManager } from "@core/Auth/AuthManager";
import type { CacheManager } from "@core/Cache/CacheManager";
import { createToken } from "@core/Container/Tokens";
import type { DatabaseManager } from "@core/Database/DatabaseManager";
import type { Encrypter } from "@core/Encryption/Encrypter";
import type { MasonManager } from "@core/Mason/MasonManager";
import type { Router } from "@core/Routing/Router";
import type { UrlGenerator } from "@core/Routing/UrlGenerator";
import type { SessionManager } from "@core/Session/SessionManager";

export const ContainerTokens = {
	App: createToken<Application>("app.instance"),
	Router: createToken<Router>("router"),
	UrlGenerator: createToken<UrlGenerator>("url.generator"),
	CacheManager: createToken<CacheManager>("cache.manager"),
	SessionManager: createToken<SessionManager>("session.manager"),
	AuthManager: createToken<AuthManager>("auth.manager"),
	Encrypter: createToken<Encrypter>("encrypter"),
	DatabaseManager: createToken<DatabaseManager>("database.manager"),
	MasonManager: createToken<MasonManager>("mason.manager"),
};
