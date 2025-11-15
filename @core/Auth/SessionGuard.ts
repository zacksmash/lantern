import type { Authenticatable } from "@core/Auth/Contracts";
import type {
	AuthCredentials,
	UserProvider,
} from "@core/Auth/UserProviders/UserProvider";
import type { HttpRequest } from "@core/Http/Request";
import type { Session } from "@core/Session/Session";
import { SessionManager } from "@core/Session/SessionManager";

const AUTH_SESSION_KEY = "auth_user";

export class SessionGuard {
	constructor(
		private request: HttpRequest,
		private provider?: UserProvider,
	) {}

	check(): boolean {
		return this.user() !== null;
	}

	user<T extends Authenticatable = Authenticatable>(): T | null {
		const cached = this.request.user<T>();
		if (cached) {
			return cached;
		}

		const session = this.request.session();
		if (!session) return null;
		const user = session.get<T>(AUTH_SESSION_KEY) ?? null;
		if (user) {
			this.request.setUser(user);
		}
		return user;
	}

	async attempt(credentials: AuthCredentials): Promise<boolean> {
		if (!this.provider) {
			throw new Error(
				"No user provider configured for this guard. Check config/auth.ts.",
			);
		}

		const user = await this.provider.retrieveByCredentials(credentials);
		if (!user) {
			return false;
		}

		const valid = await this.provider.validateCredentials(user, credentials);
		if (!valid) {
			return false;
		}

		this.login(user);
		return true;
	}

	login<T extends Authenticatable = Authenticatable>(user: T) {
		const session = this.request.session();
		if (!session) {
			throw new Error("Cannot log in without an active session.");
		}

		session.regenerate();
		session.put(AUTH_SESSION_KEY, user);
		this.request.setUser(user);
		this.queueCookie(session);
	}

	logout() {
		const session = this.request.session();
		if (session) {
			session.forget(AUTH_SESSION_KEY);
			session.regenerate();
			this.queueCookie(session);
		}
		this.request.setUser(null);
	}

	private queueCookie(session: Session) {
		const sessionConfig = globalThis.config?.("session");
		if (!sessionConfig?.cookie) {
			return;
		}

		const options = SessionManager.buildCookieOptions(sessionConfig);
		this.request
			.cookies()
			.queue(sessionConfig.cookie, session.getId(), options);
	}
}
