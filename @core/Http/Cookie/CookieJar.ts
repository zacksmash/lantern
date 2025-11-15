import type { Encrypter } from "@core/Encryption/Encrypter";

export type SameSiteOption = "lax" | "strict" | "none";

export interface CookieOptions {
	path?: string;
	domain?: string;
	expires?: Date;
	maxAge?: number;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: SameSiteOption;
}

type QueuedCookie = {
	name: string;
	value: string;
	options?: CookieOptions;
};

export class CookieJar {
	private cookies = new Map<string, string>();
	private queued: QueuedCookie[] = [];
	private encrypter: Encrypter | null = null;
	private except: Set<string> = new Set();

	constructor(header: string | null) {
		if (header) {
			this.parse(header);
		}
	}

	enableEncryption(encrypter: Encrypter, except: string[] = []) {
		this.encrypter = encrypter;
		this.except = new Set(except.map((item) => item.toLowerCase()));
	}

	all(): Record<string, string> {
		const result: Record<string, string> = {};
		for (const [key, value] of this.cookies.entries()) {
			const decrypted = this.decryptValue(key, value);
			if (typeof decrypted !== "undefined") {
				result[key] = decrypted;
			}
		}
		return result;
	}

	get(name: string): string | null {
		const value = this.cookies.get(name);
		if (typeof value === "undefined") return null;
		const decrypted = this.decryptValue(name, value);
		return typeof decrypted === "undefined" ? null : decrypted;
	}

	queue(name: string, value: string, options?: CookieOptions) {
		const payload = this.encryptValue(name, value);
		if (typeof payload === "undefined") {
			return;
		}

		this.queued.push({ name, value: payload, options });
	}

	forget(name: string, options?: CookieOptions) {
		const expires = new Date(0);
		this.queue(name, "", { ...options, expires, maxAge: 0 });
	}

	release(): string[] {
		return this.queued.splice(0).map((cookie) => this.serialize(cookie));
	}

	private parse(header: string) {
		const parts = header.split(";");
		for (const part of parts) {
			const [rawName, ...rest] = part.split("=");
			if (!rawName) continue;
			const key = rawName.trim();
			if (!key) continue;
			this.cookies.set(key, rest.join("=").trim());
		}
	}

	private serialize(cookie: QueuedCookie): string {
		const segments = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
		const options = cookie.options ?? {};

		if (options.maxAge != null) {
			segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
		}

		if (options.expires) {
			segments.push(`Expires=${options.expires.toUTCString()}`);
		}

		if (options.path) {
			segments.push(`Path=${options.path}`);
		}

		if (options.domain) {
			segments.push(`Domain=${options.domain}`);
		}

		if (options.secure) {
			segments.push("Secure");
		}

		if (options.httpOnly !== false) {
			segments.push("HttpOnly");
		}

		if (options.sameSite) {
			segments.push(`SameSite=${options.sameSite}`);
		}

		return segments.join("; ");
	}

	private encryptValue(name: string, value: string): string | undefined {
		if (!this.encrypter || this.isExcepted(name)) {
			return value;
		}

		try {
			return this.encrypter.encrypt(value);
		} catch {
			return undefined;
		}
	}

	private decryptValue(name: string, value: string): string | undefined {
		if (!this.encrypter || this.isExcepted(name)) {
			return value;
		}

		try {
			return this.encrypter.decrypt(value);
		} catch {
			return undefined;
		}
	}

	private isExcepted(name: string): boolean {
		return this.except.has(name.toLowerCase());
	}
}
