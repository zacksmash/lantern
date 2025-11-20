import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Route } from "@core/Routing/Route";
import { RouteCache } from "@core/Routing/RouteCache";

class DummyApp {
	make<T>(_token: new (...args: any[]) => T): T {
		throw new Error("not implemented");
	}
}

const app = new DummyApp() as any;

const fakeRoute = (uri: string, _name?: string): Route =>
	new Route(["GET"], uri, () => "ok", app, []);

test("route cache writes serialized route metadata", () => {
	const cachePath = path.join(tmpdir(), "lantern-route-cache.json");
	rmSync(cachePath, { force: true });

	const cache = new RouteCache(cachePath);
	const routeA = fakeRoute("/hello/{id}", "hello.show");
	const routeB = fakeRoute("/about");
	routeA.name("hello.show");
	routeA.middleware("auth");

	cache.write([routeA, routeB]);

	const raw = readFileSync(cachePath, "utf-8");
	expect(raw).toContain("hello.show");
	expect(raw).toContain("/about");
	expect(raw).toContain("auth");
});
