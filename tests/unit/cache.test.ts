import { expect, test } from "bun:test";
import { CacheManager } from "@core/Cache/CacheManager";

const config = {
	default: "memory",
	prefix: "test_cache",
	stores: {
		memory: {
			driver: "memory" as const,
		},
	},
};

test("cache manager stores and retrieves values", async () => {
	const cache = new CacheManager(config).store();

	await cache.put("foo", "bar", 10);
	const value = await cache.get("foo");

	expect(value).toBe("bar");
});

test("cache remember stores computed values", async () => {
	const cache = new CacheManager(config).store();

	const value = await cache.remember("expensive", 10, () => 42);
	const cached = await cache.get("expensive");

	expect(value).toBe(42);
	expect(cached).toBe(42);
});
