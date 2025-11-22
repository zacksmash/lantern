import type { HttpRequest } from "@core/Http/Request";
import { parseCookies } from "@core/Support/Cookies";
import { Encrypter } from "@core/Support/Crypto/Encrypter";
import { env } from "@core/Support/env";
import type { MiddlewareContract, MiddlewareNext } from "./Contracts";

export class EncryptCookies implements MiddlewareContract {
	private encrypter?: Encrypter;
	private except: Set<string>;

	constructor() {
		this.except = new Set();
	}

	async prepare(): Promise<void> {
		const key = env("APP_KEY");
		this.encrypter = await Encrypter.fromKeyString(key);
	}

	async handle(request: HttpRequest, next: MiddlewareNext) {
		if (!this.encrypter) {
			await this.prepare();
		}

		const encrypter = this.encrypter!;
		const cookies = parseCookies(request);
		for (const [name, value] of Object.entries(cookies)) {
			if (this.except.has(name)) continue;
			try {
				cookies[name] = await encrypter.decrypt(value);
			} catch {
				// drop tampered cookies
				delete cookies[name];
			}
		}

		const response = await next(request);

		// Encrypt queued cookies
		const queue = ((request as any)[Symbol.for("lantern.cookie_queue")] ??
			[]) as Array<{
			name: string;
			value: string;
			options: Record<string, unknown>;
		}>;

		if (queue.length) {
			for (const cookie of queue) {
				if (this.except.has(cookie.name)) continue;
				cookie.value = await encrypter.encrypt(cookie.value);
			}
			(request as any)[Symbol.for("lantern.cookie_queue")] = queue;
		}

		// Encrypt in-flight cookies set via Bun.Cookies if available
		const rawCookies = (request.raw as any)?.cookies?.();
		if (rawCookies && typeof rawCookies.set === "function") {
			for (const cookie of queue) {
				rawCookies.set(cookie.name, cookie.value, cookie.options);
			}
		}

		return response;
	}
}
