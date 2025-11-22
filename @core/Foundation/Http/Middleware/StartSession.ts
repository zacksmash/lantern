import { randomUUID } from "node:crypto";
import type { HttpRequest } from "@core/Http/Request";
import { ResponseFactory } from "@core/Http/ResponseFactory";
import { InMemorySessionStore, Session } from "@core/Session";
import { queueCookie, serializeCookie } from "@core/Support/Cookies";
import { Encrypter } from "@core/Support/Crypto/Encrypter";
import { env } from "@core/Support/env";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

const SESSION_SYMBOL = Symbol.for("lantern.session");
const SESSION_NAME = "app_session";
const SESSION_TTL_MINUTES = Number(env("SESSION_LIFETIME", "120"));

export class StartSession implements MiddlewareContract {
	private store = new InMemorySessionStore();

	async handle(request: HttpRequest, next: MiddlewareNext) {
		const session = await this.resolveSession(request);

		const responseValue = await next(request);
		const response = ResponseFactory.prepare(responseValue);

		await session.save();
		const cookieValue = await this.encrypt(session.idValue());
		queueCookie(request, SESSION_NAME, cookieValue, {
			path: "/",
			httpOnly: true,
			secure: env("SESSION_SECURE_COOKIE", "false") === "true",
			sameSite:
				(env("SESSION_SAME_SITE", "lax") as "lax" | "strict" | "none") ?? "lax",
			maxAge: SESSION_TTL_MINUTES * 60,
		});

		return this.attachQueuedCookies(request, response);
	}

	private async resolveSession(request: HttpRequest): Promise<Session> {
		const existing = (request as any)[SESSION_SYMBOL] as Session | undefined;
		if (existing) return existing;

		const cookies = request.header("cookie") ?? "";
		const id = await this.extractSessionId(cookies);
		const session = await Session.load(id, this.store, SESSION_TTL_MINUTES);
		(request as any)[SESSION_SYMBOL] = session;
		return session;
	}

	private async extractSessionId(cookieHeader: string): Promise<string> {
		const segments = cookieHeader.split(";").map((c) => c.trim());
		const target = segments.find((c) => c.startsWith(`${SESSION_NAME}=`));
		if (!target) {
			return randomUUID();
		}

		const raw = target.split("=")[1] ?? "";
		try {
			return await this.decrypt(decodeURIComponent(raw));
		} catch {
			return randomUUID();
		}
	}

	private async encrypt(value: string): Promise<string> {
		const key = env("APP_KEY");
		const encrypter = await Encrypter.fromKeyString(key);
		return encrypter.encrypt(value);
	}

	private async decrypt(value: string): Promise<string> {
		const key = env("APP_KEY");
		const encrypter = await Encrypter.fromKeyString(key);
		return encrypter.decrypt(value);
	}

	private attachQueuedCookies(
		request: HttpRequest,
		response: Response,
	): Response {
		const queue =
			((request as any)[Symbol.for("lantern.cookie_queue")] as Array<{
				name: string;
				value: string;
				options: Record<string, unknown>;
			}>) ?? [];

		if (!queue.length) {
			return response;
		}

		const headers = new Headers(response.headers);
		for (const cookie of queue) {
			headers.append(
				"set-cookie",
				serializeCookie(cookie.name, cookie.value, cookie.options),
			);
		}

		return new Response(response.body, { ...response, headers });
	}
}
