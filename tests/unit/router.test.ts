import type { Application } from "@core/Foundation/Application";
import { HttpRequest } from "@core/Http/Request";
import { Router } from "@core/Routing/Router";
import { route, runWithRequest } from "@core/Support/helpers";

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
		return `show:${req.route<string>("greeting")}`;
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

test("fallback routes handle unmatched requests", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router.get("/welcome", () => "ok");
	router.fallback(() => "fallback");

	const matched = await router.dispatch(
		makeRequest("http://localhost/welcome"),
	);
	expect(matched).toBe("ok");

	const fallback = await router.dispatch(
		makeRequest("http://localhost/unknown"),
	);
	expect(fallback).toBe("fallback");
});

test("routes can be constrained via global patterns", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router.pattern("greeting", "[0-9]+");
	router.get("/greetings/{greeting}", () => "number");

	const allowed = await router.dispatch(
		makeRequest("http://localhost/greetings/123"),
	);
	expect(allowed).toBe("number");

	const blocked = (await router.dispatch(
		makeRequest("http://localhost/greetings/hello"),
	)) as Response;

	expect(blocked).toBeInstanceOf(Response);
	expect(blocked.status).toBe(404);
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

	const namedRoutes = router.routesByName();
	expect(namedRoutes.has("greetings.index")).toBe(true);
	expect(router.has("greetings.show")).toBe(true);
	expect(router.has("missing.route")).toBe(false);
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

test("route model binding failures surface 404 or missing handlers", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});

	class User {
		static findOrFail(id: string) {
			if (id === "1") {
				return { id };
			}

			throw new Error("not found");
		}
	}

	router.model("user", User);

	const missingHandled = router
		.get("/users/{user}", () => "ok")
		.name("users.show")
		.missing(() => "missing");

	const handled = await router.dispatch(
		makeRequest("http://localhost/users/2"),
	);
	expect(handled).toBe("missing");

	router.get("/profiles/{user}", () => "ok");

	const response = (await router.dispatch(
		makeRequest("http://localhost/profiles/3"),
	)) as Response;

	expect(response).toBeInstanceOf(Response);
	expect(response.status).toBe(404);

	const success = await router.dispatch(
		makeRequest("http://localhost/users/1"),
	);
	expect(success).toBe("ok");
	expect(missingHandled.getName()).toBe("users.show");
});

test("generates URLs for named routes with parameters", async () => {
	const router = new Router(fakeApp);
	router.setMiddlewareSnapshot(snapshot);
	router.bindRoutes({});
	router
		.get("/teams/{team}/users/{user?}", GreetingController)
		.name("teams.users");

	const path = router.toUrl("teams.users", { team: 5, user: "me" }, false);
	expect(path).toBe("/teams/5/users/me");

	const absolute = router.toUrl("teams.users", {
		team: 5,
		user: "me",
		__origin: "http://localhost",
	});
	expect(absolute).toBe("http://localhost/teams/5/users/me");

	const appStub = {
		getBasePath: () => process.cwd(),
		make<T>(token: new (...args: any[]) => T): T {
			if (token === Router) {
				return router as unknown as T;
			}

			return new token();
		},
	};

	// @ts-expect-error test-only global
	globalThis.__lantern_app = appStub;

	await runWithRequest(makeRequest("http://example.com"), async () => {
		const helperUrl = route("teams.users", { team: "x" });
		expect(helperUrl).toBe("http://example.com/teams/x/users");
	});
});
