import { expect, test } from "bun:test";
import { Container } from "@core/Container";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { MiddlewareManager } from "@core/Http/Middleware/Manager";
import type { MiddlewareConfiguration } from "@core/Http/Middleware/Manifest";
import type { HttpRequest } from "@core/Http/Request";
import type { MiddlewareIdentifier } from "@core/Routing/Route";

class FirstMiddleware implements Middleware {
	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		return next();
	}
}

class SecondMiddleware implements Middleware {
	async handle(_request: HttpRequest, next: () => Promise<Response>) {
		return next();
	}
}

const config: MiddlewareConfiguration = {
	global: [FirstMiddleware],
	groups: {
		web: ["second", FirstMiddleware],
		api: [],
	},
	aliases: {
		second: SecondMiddleware,
	},
};

test("middleware manager expands global stack", () => {
	const manager = new MiddlewareManager(config);
	const container = new Container();
	container.singleton(FirstMiddleware, FirstMiddleware);
	container.singleton(SecondMiddleware, SecondMiddleware);

	const globalStack = manager.getGlobalMiddleware(container);
	expect(globalStack).toHaveLength(1);
	expect(globalStack[0]).toBeInstanceOf(FirstMiddleware);
});

test("middleware manager expands groups and aliases in order", () => {
	const manager = new MiddlewareManager(config);
	const container = new Container();
	container.singleton(FirstMiddleware, FirstMiddleware);
	container.singleton(SecondMiddleware, SecondMiddleware);

	const routeStack = manager.getRouteMiddleware(["web"], container);
	expect(routeStack).toHaveLength(2);
	expect(routeStack[0]).toBeInstanceOf(SecondMiddleware);
	expect(routeStack[1]).toBeInstanceOf(FirstMiddleware);
});

test("middleware manager throws on unknown middleware identifier", () => {
	const manager = new MiddlewareManager(config);
	const container = new Container();

	expect(() =>
		manager.getRouteMiddleware(["missing" as MiddlewareIdentifier], container),
	).toThrow(/middleware alias or group "missing"/i);
});
