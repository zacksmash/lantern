import { ErrorHandler } from "@core/Http/ErrorHandler";
import { HttpException } from "@core/Http/Exceptions/HttpException";

test("returns the response from an HttpException", async () => {
	const handler = new ErrorHandler();
	const response = handler.handle(
		new HttpException("Not Found", 404, { body: "Missing" }),
	);

	expect(response.status).toBe(404);
	expect(await response.text()).toBe("Missing");
});

test("rethrows in debug mode when allowed", () => {
	const handler = new ErrorHandler({ debug: true });

	expect(() =>
		handler.handle(new Error("oops"), { allowDebugRethrow: true }),
	).toThrow("oops");
});

test("renders a production-friendly response when not debugging", async () => {
	const handler = new ErrorHandler({ debug: false, appName: "TestApp" });
	const response = handler.handle(new Error("boom"), {
		request: new Request("https://example.com/path"),
	});

	expect(response.status).toBe(500);
	expect(response.headers.get("content-type")).toContain("text/html");

	const body = await response.text();
	expect(body).toContain("TestApp - Server Error");
	expect(body).toContain("Path: /path");
	expect(body).toContain("Reference: boom");
});
