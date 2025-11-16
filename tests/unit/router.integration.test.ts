import { Router } from "@core/Routing/Router";
import type { Application } from "@core/Foundation/Application";
import { HttpRequest } from "@core/Http/Request";

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
expect(typeof response).toBe("string");
});
