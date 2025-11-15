import { RequestContext } from "@core/Application/RequestContext";
import type { Authenticatable } from "@core/Auth/Contracts";
import { SessionGuard } from "@core/Auth/SessionGuard";
import {
	ArrayUserProvider,
	type ArrayUserRecord,
} from "@core/Auth/UserProviders/ArrayUserProvider";
import type {
	AuthCredentials,
	UserProvider,
} from "@core/Auth/UserProviders/UserProvider";

type GuardConfig = {
	driver: "session";
	provider?: string;
};

type ArrayProviderConfig = {
	driver: "array";
	identifier?: string;
	users: ArrayUserRecord[];
};

type ProviderConfig = ArrayProviderConfig;

type AuthConfig = {
	defaults?: {
		guard: string;
	};
	guards?: Record<string, GuardConfig>;
	providers?: Record<string, ProviderConfig>;
};

export class AuthManager {
	private config: AuthConfig;
	private providers = new Map<string, UserProvider>();

	constructor(config?: AuthConfig) {
		this.config = config ?? (globalThis.config?.("auth") as AuthConfig);
	}

	guard(name?: string): SessionGuard {
		const request = RequestContext.get();
		if (!request) {
			throw new Error("No active request context for authentication.");
		}

		const guardName = name ?? this.config.defaults?.guard ?? "web";
		const guardConfig = this.config.guards?.[guardName];
		if (!guardConfig || guardConfig.driver !== "session") {
			throw new Error(`Auth guard "${guardName}" is not configured.`);
		}

		const provider = guardConfig.provider
			? this.resolveProvider(guardConfig.provider)
			: undefined;

		return new SessionGuard(request, provider);
	}

	user<T extends Authenticatable = Authenticatable>(): T | null {
		return this.guard().user<T>();
	}

	check(): boolean {
		return this.guard().check();
	}

	async attempt(credentials: AuthCredentials, name?: string): Promise<boolean> {
		return await this.guard(name).attempt(credentials);
	}

	login<T extends Authenticatable = Authenticatable>(user: T, name?: string) {
		this.guard(name).login(user);
	}

	logout(name?: string) {
		this.guard(name).logout();
	}

	private resolveProvider(name: string): UserProvider {
		if (this.providers.has(name)) {
			return this.providers.get(name)!;
		}

		const providerConfig = this.config.providers?.[name];
		if (!providerConfig) {
			throw new Error(`Auth provider "${name}" is not configured.`);
		}

		let provider: UserProvider;

		switch (providerConfig.driver) {
			case "array":
				provider = new ArrayUserProvider(providerConfig);
				break;
			default:
				throw new Error(
					`Auth provider driver "${(providerConfig as ProviderConfig).driver}" is not supported.`,
				);
		}

		this.providers.set(name, provider);
		return provider;
	}
}
