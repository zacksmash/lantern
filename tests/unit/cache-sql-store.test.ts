import { expect, test } from "bun:test";
import { SqlStore } from "@core/Cache/Stores/SqlStore";

const createSqliteStore = () =>
	new SqlStore("sqlite", {
		connection: {
			adapter: "sqlite",
			filename: ":memory:",
		},
		table: "cache_sqlite_tests",
	});

test("sqlite sql cache store persists values", async () => {
	const store = createSqliteStore();

	await store.put("foo", { bar: "baz" }, 60);
	const cached = await store.get("foo");
	expect(cached).toBeDefined();
	expect(cached).toEqual({ bar: "baz" });

	await store.forget("foo");
	expect(await store.get("foo")).toBeUndefined();
});

test("sqlite sql cache honours expiration", async () => {
	const store = createSqliteStore();
	await store.put("expire-me", "value", 0);
	expect(await store.get("expire-me")).toBeUndefined();
});
