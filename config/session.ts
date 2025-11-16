export default {
	driver: env("SESSION_CACHE_DRIVER", "memory"),
	cookie: env("SESSION_COOKIE", "app_session"),
	lifetime: Number(env("SESSION_LIFETIME", "120")),
	path: env("SESSION_PATH", "/"),
	domain: env("SESSION_DOMAIN", "") || undefined,
	secure: env("SESSION_SECURE_COOKIE", "false") === "true",
	httpOnly: env("SESSION_HTTP_ONLY", "true") !== "false",
	sameSite:
		(env("SESSION_SAME_SITE", "lax") as "lax" | "strict" | "none") ?? "lax",
	encrypt_except: ["XSRF-TOKEN"],
};
