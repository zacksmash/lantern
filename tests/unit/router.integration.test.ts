import { rmSync } from "node:fs";
import type { Application } from "@core/Foundation/Application";
import { HttpRequest } from "@core/Http/Request";
import { ResponseFactory } from "@core/Http/ResponseFactory";
import { RouteCache } from "@core/Routing/RouteCache";
import { Router } from "@core/Routing/Router";

const fakeApp = {
	getBasePath: () => process.cwd(),
	make<T>(token: new (...args: any[]) => T): T {
		return new token();
	},
} as unknown as Application;

const snapshot = {
	cookies: { except: [] },
	global: [],
	groups: {
		web: [],
		api: [],
	},
	aliases: {},
};

const makeRequest = (url: string, method = "GET") =>
	HttpRequest.capture(new Request(url, { method }));

test("loads external route files and matches closures", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({
		web: `${process.cwd()}/routes/web.ts`,
	});

	const appStub = {
		getBasePath: () => process.cwd(),
		make<T>(token: new (...args: any[]) => T): T {
			if (token === Router) {
				return router as unknown as T;
			}

			return new token();
		},
	} as unknown as Application;

	globalThis.__lantern_app = appStub;

	const response = await router.dispatch(makeRequest("http://localhost/"));
	const prepared = ResponseFactory.prepare(response);
	expect(prepared).toBeInstanceOf(Response);
	const payload = await prepared.json();
	expect(payload).toMatchObject({ message: "Welcome to Lantern!" });
});

test("route cache is readable metadata (not dispatchable)", async () => {
	const cachePath = `${process.cwd()}/storage/framework/routes-test.json`;
	const writer = new RouteCache(cachePath);
	writer.write([
		new Router(fakeApp).addRoute(["GET"], "/cached", () => "cached"),
	]);

	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});

	const payload = router.loadCachedRoutes(cachePath);
	expect(payload?.routes[0]?.uri).toBe("/cached");

	const response = (await router.dispatch(
		makeRequest("http://localhost/cached"),
	)) as Response;
	expect(response.status).toBe(404);

	rmSync(cachePath, { force: true });
});
