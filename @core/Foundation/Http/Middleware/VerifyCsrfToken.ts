import type { HttpRequest } from "@core/Http/Request";
import { parseCookies, queueCookie } from "@core/Support/Cookies";
import { Encrypter } from "@core/Support/Crypto/Encrypter";
import { env } from "@core/Support/env";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class VerifyCsrfToken implements MiddlewareContract {
	private encrypter?: Encrypter;
	private except: string[] = [];

	async handle(request: HttpRequest, next: MiddlewareNext) {
		if (!this.encrypter) {
			this.encrypter = await Encrypter.fromKeyString(env("APP_KEY"));
		}

		if (this.shouldPassThrough(request)) {
			return next(request);
		}

		if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
			return next(request);
		}

		const valid = await this.tokensMatch(request);
		if (!valid) {
			return new Response("Invalid CSRF token", { status: 419 });
		}

		return next(request);
	}

	private async tokensMatch(request: HttpRequest): Promise<boolean> {
		const cookies = parseCookies(request);
		const headerToken =
			request.header("x-csrf-token") ?? request.header("x-xsrf-token") ?? "";
		const payload = (await request.input("_token")) as string | undefined;
		const token = headerToken || payload || "";

		const cookieToken = cookies["XSRF-TOKEN"];
		if (!cookieToken) return false;

		try {
			const encrypter = this.encrypter!;
			const decryptedCookie = await encrypter.decrypt(cookieToken);
			return token === decryptedCookie;
		} catch {
			return false;
		}
	}

	private shouldPassThrough(request: HttpRequest): boolean {
		const path = request.path();
		return this.except.some((pattern) => path.startsWith(pattern));
	}

	static async generateXsrfCookie(request: HttpRequest): Promise<void> {
		const encrypter = await Encrypter.fromKeyString(env("APP_KEY"));
		const token = crypto.randomUUID();
		const encrypted = await encrypter.encrypt(token);
		queueCookie(request, "XSRF-TOKEN", encrypted, {
			httpOnly: false,
			path: "/",
			sameSite: "lax",
		});
	}
}
