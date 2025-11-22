import type { HttpRequest } from "@core/Http/Request";
import type { Session } from "@core/Session";
import type { Authenticatable, Guard } from "./Contracts";

const SESSION_USER_KEY = "_auth_user_id";

export class SessionGuard implements Guard {
	async user(request: HttpRequest): Promise<Authenticatable | null> {
		const session = (request as any)[Symbol.for("lantern.session")] as
			| Session
			| undefined;
		if (!session) return null;
		const id = session.get<string | number>(SESSION_USER_KEY);
		if (!id) return null;

		// Placeholder: resolve user from provider when available
		return {
			getAuthIdentifier: () => id,
		};
	}

	async login(user: Authenticatable, request: HttpRequest): Promise<void> {
		const session = (request as any)[Symbol.for("lantern.session")] as
			| Session
			| undefined;
		if (!session) return;
		session.put(SESSION_USER_KEY, user.getAuthIdentifier());
	}

	async logout(request: HttpRequest): Promise<void> {
		const session = (request as any)[Symbol.for("lantern.session")] as
			| Session
			| undefined;
		if (!session) return;
		session.forget(SESSION_USER_KEY);
	}
}
