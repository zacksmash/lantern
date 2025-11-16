import { HttpRequest } from "@core/Http/Request";
import { request, response, runWithRequest } from "@core/Support/helpers";

test("response helper returns a ResponseBuilder", async () => {
	const res = response().json({ ok: true }).toResponse();
	expect(res.headers.get("content-type")).toContain("application/json");
	expect(await res.json()).toEqual({ ok: true });
});

test("request helper exposes the current HttpRequest", async () => {
	const req = HttpRequest.capture(new Request("http://localhost/test"));
	await runWithRequest(req, async () => {
		expect(request()).toBe(req);
	});
});
