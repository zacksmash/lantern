import type { HttpRequest } from "@core/Http/Request";

export interface CookieOptions {
	path?: string;
	domain?: string;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "lax" | "strict" | "none";
	expires?: Date;
	maxAge?: number;
}

const COOKIE_BAG = Symbol.for("lantern.cookies");
const COOKIE_QUEUE = Symbol.for("lantern.cookie_queue");

export const parseCookies = (request: HttpRequest): Record<string, string> => {
	const memo = (request as any)[COOKIE_BAG] as
		| Record<string, string>
		| undefined;
	if (memo) return memo;

	const parsed: Record<string, string> = {};
	const rawCookies = (request.raw as any)?.cookies?.();
	if (rawCookies && typeof rawCookies.get === "function") {
		for (const [name, value] of rawCookies.entries()) {
			parsed[name] = value;
		}
	} else {
		const header = request.header("cookie") ?? "";
		header
			.split(";")
			.map((c) => c.trim())
			.filter(Boolean)
			.forEach((pair) => {
				const [key, ...rest] = pair.split("=");
				if (!key) return;
				parsed[key] = decodeURIComponent(rest.join("=") ?? "");
			});
	}

	(request as any)[COOKIE_BAG] = parsed;
	return parsed;
};

export const queueCookie = (
	request: HttpRequest,
	name: string,
	value: string,
	options: CookieOptions = {},
): void => {
	const queue = ((request as any)[COOKIE_QUEUE] ?? []) as Array<{
		name: string;
		value: string;
		options: CookieOptions;
	}>;
	queue.push({ name, value, options });
	(request as any)[COOKIE_QUEUE] = queue;
};

export const queuedCookies = (
	request: HttpRequest,
): Array<{ name: string; value: string; options: CookieOptions }> => {
	return (
		((request as any)[COOKIE_QUEUE] ?? []) as Array<{
			name: string;
			value: string;
			options: CookieOptions;
		}>
	).slice();
};

export const clearQueuedCookies = (request: HttpRequest): void => {
	(request as any)[COOKIE_QUEUE] = [];
};

const serializeOption = (
	name: string,
	value: string | number | boolean | undefined,
): string => {
	if (typeof value === "undefined" || value === null || value === false) {
		return "";
	}

	if (value === true) {
		return `; ${name}`;
	}

	return `; ${name}=${value}`;
};

export const serializeCookie = (
	name: string,
	value: string,
	options: CookieOptions,
): string => {
	let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
	cookie += serializeOption("Path", options.path ?? "/");
	cookie += serializeOption("Domain", options.domain);
	cookie += serializeOption("Secure", options.secure);
	cookie += serializeOption("HttpOnly", options.httpOnly ?? true);
	cookie += serializeOption("SameSite", options.sameSite);
	if (options.expires) {
		cookie += serializeOption("Expires", options.expires.toUTCString());
	}
	if (typeof options.maxAge === "number") {
		cookie += serializeOption("Max-Age", options.maxAge);
	}

	return cookie;
};
