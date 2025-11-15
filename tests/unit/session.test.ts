import { expect, test } from "bun:test";
import { CacheManager } from "@core/Cache/CacheManager";
import { HttpRequest } from "@core/Http/Request";
import { SessionManager } from "@core/Session/SessionManager";

const cacheConfig = {
	default: "memory",
	prefix: "test_session",
	stores: {
		memory: {
			driver: "memory" as const,
		},
	},
};

const sessionConfig = {
	driver: "memory",
	cookie: "lantern_session",
	lifetime: 120,
	path: "/",
};

test("session manager persists data between requests", async () => {
	const cache = new CacheManager(cacheConfig);
	const manager = new SessionManager(cache, sessionConfig);

	const firstRequest = new HttpRequest(new Request("http://localhost"));
	const session = await manager.start(firstRequest);
	session.put("message", "hello");
	await manager.save(session);

	const cookie = firstRequest.cookies().release()[0];
	if (!cookie) {
		throw new Error("Session cookie was not queued.");
	}
	expect(cookie).toContain(`${sessionConfig.cookie}=`);

	const cookieValue = cookie.split(";")[0];
	if (!cookieValue) {
		throw new Error("Session cookie missing value.");
	}

	const secondRequest = new HttpRequest(
		new Request("http://localhost", {
			headers: {
				cookie: cookieValue,
			},
		}),
	);

	const loaded = await manager.start(secondRequest);
	const value = loaded.get<string>("message");
	if (typeof value === "undefined") {
		throw new Error("Failed to load session value.");
	}
	expect(value).toBe("hello");
});
