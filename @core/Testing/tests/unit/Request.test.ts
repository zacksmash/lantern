import { LanternRequest, runWithRequest, useRequest } from "@core/Http/Request";

test("wraps the raw request and exposes path and query", async () => {
	const raw = new Request("https://example.com/users?id=1&id=2&role=admin", {
		method: "POST",
	});

	await runWithRequest(raw, async (req) => {
		expect(req).toBeInstanceOf(LanternRequest);
		expect(req.path).toBe("/users");
		expect(req.method).toBe("POST");
		expect(req.query).toEqual({ id: ["1", "2"], role: "admin" });
	});
});

test("useRequest provides the current request inside the context", async () => {
	const raw = new Request("https://example.com");

	await runWithRequest(raw, async () => {
		const current = useRequest();
		expect(current.url).toBe(raw.url);
	});
});

test("useRequest throws when no context is available", () => {
	expect(() => useRequest()).toThrow("No request context is available");
});
