import { expect, test } from "bun:test";
import { HttpKernel } from "@core/Http/Kernel";
import { HttpRequest } from "@core/Http/Request";

const requestFor = (path: string) =>
	new HttpRequest(new Request(`http://localhost${path}`));

test("serves static assets within public directory", async () => {
	const request = requestFor("/robots.txt");
	const response = await new HttpKernel(request).boot();

	expect(response.status).toBe(200);
	expect(await response.text()).toContain("User-agent");
});

test("prevents directory traversal when serving static assets", async () => {
	const request = requestFor("/../package.json");
	const response = await new HttpKernel(request).boot();

	expect(response.status).toBe(404);
	expect(await response.text()).toBe("Not Found");
});
