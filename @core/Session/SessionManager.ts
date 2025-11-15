import type { CacheManager } from "@core/Cache/CacheManager";
import type { CacheRepository } from "@core/Cache/CacheRepository";
import type { HttpRequest } from "@core/Http/Request";
import { Session, type SessionData } from "@core/Session/Session";

type SessionConfig = {
	driver?: string;
	cookie: string;
	lifetime: number;
	path?: string;
	domain?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: "lax" | "strict" | "none";
};

export class SessionManager {
	private cache: CacheManager;
	private config: SessionConfig;

	constructor(cache: CacheManager, config?: SessionConfig) {
		this.cache = cache;
		this.config = config ?? (globalThis.config?.("session") as SessionConfig);
	}

	async start(request: HttpRequest): Promise<Session> {
		const cookieName = this.config.cookie;
		const jar = request.cookies();
		let sessionId = jar.get(cookieName);

		if (!sessionId) {
			sessionId = Session.generateId();
		}

		const payload =
			(await this.store().get<SessionData>(this.sessionKey(sessionId))) ?? {};

		const session = new Session(sessionId, payload);

		session.ageFlashData();
		request.setSession(session);

		jar.queue(cookieName, session.getId(), this.cookieOptions());

		return session;
	}

	async save(session: Session) {
		const ttl = Math.max(1, Number(this.config.lifetime ?? 120) * 60);
		const previous = session.consumePreviousId();

		if (previous && previous !== session.getId()) {
			await this.store().forget(this.sessionKey(previous));
		}

		await this.store().put(
			this.sessionKey(session.getId()),
			session.toJSON(),
			ttl,
		);
	}

	private sessionKey(id: string): string {
		return `session:${id}`;
	}

	private cookieOptions() {
		return SessionManager.buildCookieOptions(this.config);
	}

	static buildCookieOptions(config: SessionConfig) {
		return {
			path: config.path ?? "/",
			domain: config.domain,
			secure: config.secure ?? false,
			httpOnly: config.httpOnly ?? true,
			sameSite: config.sameSite ?? "lax",
			maxAge: Number(config.lifetime ?? 120) * 60,
		};
	}

	private store(): CacheRepository {
		const storeName = this.config.driver ?? "memory";
		return this.cache.store(storeName);
	}
}
