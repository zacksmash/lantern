import { createHmac, timingSafeEqual } from "node:crypto";
import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { AuthManager } from "@core/Auth/AuthManager";
import type { Authenticatable } from "@core/Auth/Contracts";
import type { Encrypter } from "@core/Encryption/Encrypter";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";
import type { SessionManager } from "@core/Session/SessionManager";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export class EncryptCookies implements Middleware {
	static inject = [ContainerTokens.Encrypter];

	constructor(private encrypter: Encrypter) {}

	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const except = (globalThis.config?.(
			"session.encrypt_except",
		) as string[]) ?? ["XSRF-TOKEN"];
		request.cookies().enableEncryption(this.encrypter, except);
		return next();
	}
}

export class AddQueuedCookiesToResponse implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const response = await next();
		const queue = request.cookies().release();
		if (queue.length === 0) {
			return response;
		}

		const headers = new Headers(response.headers);
		for (const cookie of queue) {
			headers.append("Set-Cookie", cookie);
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}
}

export class StartSession implements Middleware {
	static inject = [ContainerTokens.SessionManager];

	constructor(private sessions: SessionManager) {}

	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const session = await this.sessions.start(request);
		try {
			const response = await next();
			await this.sessions.save(session);
			return response;
		} catch (error) {
			await this.sessions.save(session);
			throw error;
		}
	}
}

export class ShareErrorsFromSession implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const session = request.session();
		if (session?.has("errors")) {
			request.setAttribute("errors", session.get("errors"));
			session.forget("errors");
		}

		return next();
	}
}

export class VerifyCsrfToken implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const session = request.session();
		if (!session) {
			return new Response("CSRF token missing.", { status: 419 });
		}

		const token = session.token();
		request
			.cookies()
			.queue("XSRF-TOKEN", token, { httpOnly: false, sameSite: "lax" });

		if (safeMethods.has(request.method)) {
			return next();
		}

		const payload = await this.extractToken(request);

		if (!payload || !this.tokensMatch(token, payload)) {
			return new Response("CSRF token mismatch.", { status: 419 });
		}

		return next();
	}

	private async extractToken(request: HttpRequest) {
		const headerToken =
			request.header("x-xsrf-token") || request.header("x-csrf-token");
		if (headerToken) return headerToken;

		const inputToken = (await request.input("_token")) as string | undefined;
		if (inputToken) return inputToken;

		const queryToken = request.query("_token");
		if (Array.isArray(queryToken)) {
			return queryToken[0];
		}
		return queryToken ?? undefined;
	}

	private tokensMatch(first: string, second: string): boolean {
		const a = Buffer.from(first);
		const b = Buffer.from(second);
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	}
}

export class SubstituteBindings implements Middleware {
	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		return next();
	}
}

export class Authenticate implements Middleware {
	static inject = [ContainerTokens.AuthManager];

	constructor(private auth: AuthManager) {}

	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		if (!this.auth.check()) {
			return new Response("Unauthorized", { status: 401 });
		}

		return next();
	}
}

export class AuthenticateWithBasic implements Middleware {
	static inject = [ContainerTokens.AuthManager];

	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const header = request.header("authorization");
		const basicConfig = globalThis.config?.("auth.basic") ?? {};
		const expectedUser = basicConfig.username;
		const expectedPass = basicConfig.password;
		const realm = basicConfig.realm ?? "Restricted Area";

		if (!expectedUser || !expectedPass) {
			return new Response("Basic auth is not configured.", { status: 500 });
		}

		if (!header?.startsWith("Basic ")) {
			return this.challenge(realm);
		}

		const decoded = Buffer.from(
			header.replace("Basic ", ""),
			"base64",
		).toString("utf8");
		const [username = "", password = ""] = decoded.split(":");

		if (username !== expectedUser || password !== expectedPass) {
			return this.challenge(realm);
		}

		if (!request.user()) {
			request.setUser({ id: username, name: username });
		}

		return next();
	}

	private challenge(realm: string) {
		return new Response("Unauthorized", {
			status: 401,
			headers: {
				"WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
			},
		});
	}
}

export class AuthenticateSession implements Middleware {
	static inject = [ContainerTokens.AuthManager];

	constructor(private auth: AuthManager) {}

	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		this.auth.guard().user();
		return next();
	}
}

export class CacheHeaders implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const response = await next();
		const config = request.getAttribute<{
			maxAge?: number;
			public?: boolean;
			private?: boolean;
		}>("cache.headers");

		if (!config) {
			return response;
		}

		const headers = new Headers(response.headers);
		const visibility = config.public
			? "public"
			: config.private
				? "private"
				: "";
		const maxAge =
			typeof config.maxAge === "number" ? `, max-age=${config.maxAge}` : "";

		headers.set("Cache-Control", `${visibility}${maxAge}`.replace(/^,?\s/, ""));

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}
}

export class Authorize implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const user = request.user();
		if (!user) {
			return new Response("Forbidden", { status: 403 });
		}

		return next();
	}
}

export class RedirectIfAuthenticated implements Middleware {
	static inject = [ContainerTokens.AuthManager];

	constructor(private auth: AuthManager) {}

	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		if (this.auth.check()) {
			const redirectTo =
				globalThis.config?.("auth.redirects.authenticated") ?? "/";
			return Response.redirect(redirectTo, 302);
		}

		return next();
	}
}

export class RequirePassword implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const timestamp = request.session()?.get<number>("password_confirmed_at");
		if (!timestamp) {
			return new Response("Password confirmation required.", { status: 423 });
		}

		const timeout =
			Number(globalThis.config?.("auth.password_timeout")) || 10800;
		if (Date.now() - timestamp * 1000 > timeout * 1000) {
			return new Response("Password confirmation expired.", { status: 423 });
		}

		return next();
	}
}

export class ValidateSignature implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const url = new URL(request.urlInstance.toString());
		const signature = url.searchParams.get("signature");
		const expires = url.searchParams.get("expires");
		const secret =
			globalThis.env?.("APP_KEY", "") ?? process.env.APP_KEY ?? "lantern";

		if (!signature) {
			return new Response("Signature missing.", { status: 403 });
		}

		if (expires && Number(expires) < Date.now() / 1000) {
			return new Response("Signed URL expired.", { status: 403 });
		}

		url.searchParams.delete("signature");
		const expected = createHmac("sha256", secret)
			.update(url.toString())
			.digest("hex");

		if (!this.secureCompare(signature, expected)) {
			return new Response("Invalid signature.", { status: 403 });
		}

		return next();
	}

	private secureCompare(a: string, b: string): boolean {
		const bufA = Buffer.from(a);
		const bufB = Buffer.from(b);
		if (bufA.length !== bufB.length) return false;
		return timingSafeEqual(bufA, bufB);
	}
}

export class EnsureEmailIsVerified implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const user = request.user<Authenticatable>();
		if (!user) {
			return new Response("Unauthorized", { status: 401 });
		}

		const verified =
			Boolean(user.emailVerified) ||
			Boolean(user.email_verified) ||
			Boolean(user.email_verified_at) ||
			Boolean(user.emailVerifiedAt);

		if (!verified) {
			return new Response("Email verification required.", { status: 403 });
		}

		return next();
	}
}
