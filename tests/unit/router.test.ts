import { describe, expect, test } from "bun:test";
import { Container } from "@core/Container";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { HttpRequest } from "@core/Http/Request";
import type { RouteMatch } from "@core/Routing/Router";
import { Router } from "@core/Routing/Router";

class DummyMiddleware implements Middleware {
	static hits = 0;

	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		DummyMiddleware.hits += 1;
		return next();
	}
}

class GreetingController {
	invoke(request: HttpRequest) {
		const user = request.params("user", "guest");
		return new Response(JSON.stringify({ hello: user }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	greet(request: HttpRequest) {
		return new Response(`hello ${request.params("name", "world")}`);
	}
}

class GreeterService {
	greet() {
		return "injected";
	}
}

class InjectedController {
	static inject = [GreeterService];

	constructor(private greeter: GreeterService) {}

	invoke() {
		return new Response(this.greeter.greet());
	}
}

const createRequest = (url: string, method = "GET") =>
	new HttpRequest(new Request(url, { method }));

describe("Router", () => {
	test("matches named routes with prefixes and middleware", async () => {
		const router = new Router();
		router.aliasMiddleware("log", DummyMiddleware);

		router
			.middleware("log")
			.prefix("api")
			.name("api.")
			.group(() => {
				router.get("/users/{user}", GreetingController).name("users.show");
			});

		const request = createRequest("http://localhost/api/users/42");
		const match = router.matchRoute(request) as RouteMatch;

		expect(match.route.getName()).toBe("api.users.show");
		expect(match.params.user).toBe("42");
		expect(request.params("user")).toBe("42");

		const response = await router.dispatch(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ hello: "42" });

		// route-specific middleware should be resolved via alias when HttpKernel asks for it
		const middlewareInstance = router.instantiateMiddleware("log");
		expect(middlewareInstance).toBeInstanceOf(DummyMiddleware);
	});

	test("controller groups convert string actions into controller methods", async () => {
		const router = new Router();

		router.controller(GreetingController).group(() => {
			router.get("/greeting/{name?}", "greet").name("greet");
		});

		const request = createRequest("http://localhost/greeting");
		const match = router.matchRoute(request);
		expect(match?.route.getName()).toBe("greet");

		const response = await router.dispatch(request);
		expect(await response.text()).toBe("hello world");
	});

	test("routes registered via match/any handle multiple verbs", async () => {
		const router = new Router();

		router.match(["POST", "PUT"], "/submit", (_req) => new Response("ok"));
		router.any("/wild", (_req) => new Response("wild"));

		const postRequest = createRequest("http://localhost/submit", "POST");
		const putRequest = createRequest("http://localhost/submit", "PUT");
		const deleteRequest = createRequest("http://localhost/wild", "DELETE");

		expect((await router.dispatch(postRequest)).status).toBe(200);
		expect((await router.dispatch(putRequest)).status).toBe(200);
		expect((await router.dispatch(deleteRequest)).status).toBe(200);

		const getMiss = createRequest("http://localhost/submit", "GET");
		const response = await router.dispatch(getMiss);
		expect(response.status).toBe(404);
	});

	test("router resolves controllers through the container", async () => {
		const container = new Container();
		container.singleton(GreeterService, GreeterService);

		const router = new Router(container);
		router.get("/injected", InjectedController);

		const response = await router.dispatch(
			createRequest("http://localhost/injected"),
		);
		expect(await response.text()).toBe("injected");
	});
});
