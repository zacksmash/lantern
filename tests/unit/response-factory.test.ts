import { HttpResponse } from "@core/Http/Response";
import { ResponseFactory } from "@core/Http/ResponseFactory";

test("passes through Response instances", () => {
	const response = HttpResponse.make("ok", { status: 201 });
	expect(ResponseFactory.prepare(response)).toBe(response);
});

test("renders strings as HTML fragments", async () => {
	const response = ResponseFactory.prepare("<p>Hello</p>");
	expect(response.headers.get("content-type")).toContain("text/html");
	expect(await response.text()).toBe("<p>Hello</p>");
});

test("serializes objects/arrays/dates to JSON", async () => {
	const response = ResponseFactory.prepare({ page: "home" });
	expect(response.headers.get("content-type")).toContain("application/json");
	expect(await response.json()).toEqual({ page: "home" });

	const date = new Date("2025-01-01T00:00:00.000Z");
	const dateResponse = ResponseFactory.prepare(date);
	expect(await dateResponse.json()).toBe(date.toISOString());
});

test("handles null/undefined as no content", () => {
	expect(ResponseFactory.prepare(null).status).toBe(204);
	expect(ResponseFactory.prepare(undefined).status).toBe(204);
});
