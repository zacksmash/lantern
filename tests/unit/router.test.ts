import type { Application } from "@core/Foundation/Application";
import { HttpRequest } from "@core/Http/Request";
import { Router } from "@core/Routing/Router";

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

class GreetingController {
	async invoke(): Promise<string> {
		return "hello";
	}

	async show(req: HttpRequest): Promise<string> {
		return `show:${req.route("greeting")}`;
	}
}

const fakeApp = {
	getBasePath: () => process.cwd(),
	make<T>(token: new (...args: any[]) => T): T {
		return new token();
	},
} as unknown as Application;

test("dispatches simple GET routes", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router.get("/hello", () => "world");

	const response = await router.dispatch(makeRequest("http://localhost/hello"));
	expect(response).toBe("world");
});

test("controller invocation resolves invoke and named methods", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router.get("/greetings", GreetingController).name("greetings.index");
	router
		.get("/greetings/{greeting}", [GreetingController, "show"])
		.name("greetings.show");

	const req = makeRequest("http://localhost/greetings/hello");
	const response = await router.dispatch(req);
	expect(response).toBe("show:hello");

	const routes = router.getRoutes();
	const names = routes.map((route) => route.getName());
	expect(names).toContain("greetings.index");
	expect(names).toContain("greetings.show");
});

test("resource registration creates all RESTful routes", () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router.resource("photos", GreetingController);

	const routes = router.getRoutes();
	const names = routes.map((route) => route.getName());

	expect(names).toContain("photos.index");
	expect(names).toContain("photos.show");
	expect(names).toContain("photos.destroy");
});
