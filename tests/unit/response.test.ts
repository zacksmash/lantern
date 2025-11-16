import { HttpResponse, response } from "@core/Http/Response";

test("HttpResponse.json creates JSON responses with status", async () => {
	const res = HttpResponse.json(
		{ ok: true },
		{
			status: 201,
		},
	);

	expect(res.status).toBe(201);
	expect(res.headers.get("content-type")).toContain("application/json");
	expect(await res.json()).toEqual({ ok: true });
});

test("Response builder supports chaining headers/status", async () => {
	const builder = response()
		.status(202)
		.header("x-powered-by", "lantern")
		.json({ message: "accepted" });

	const final = builder.toResponse();

	expect(final.status).toBe(202);
	expect(final.headers.get("x-powered-by")).toBe("lantern");
	expect(await final.json()).toEqual({ message: "accepted" });
});

test("HttpResponse.redirect proxies to native redirect", () => {
	const res = HttpResponse.redirect("https://example.com", 301);
	expect(res.status).toBe(301);
	expect(res.headers.get("Location")).toBe("https://example.com");
});
