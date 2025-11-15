import { expect, test } from "bun:test";
import { Router } from "@core/Routing/Router";
import { UrlGenerator } from "@core/Routing/UrlGenerator";

const routerWithRoute = () => {
	const router = new Router();
	router.get("/users/{user}", () => new Response()).name("users.show");
	router.get("/posts/{post?}", () => new Response()).name("posts.show");
	return router;
};

test("generates absolute URLs with required parameters", () => {
	const router = routerWithRoute();
	const generator = new UrlGenerator(router, "https://example.test");

	const url = generator.route("users.show", { user: 42 });

	expect(url).toBe("https://example.test/users/42");
});

test("handles optional parameters and query strings", () => {
	const router = routerWithRoute();
	const generator = new UrlGenerator(router, "https://example.test");

	const withOptional = generator.route("posts.show", { post: 5 });
	expect(withOptional).toBe("https://example.test/posts/5");

	const withoutOptional = generator.route("posts.show", {});
	expect(withoutOptional).toBe("https://example.test/posts");

	const withQuery = generator.route("users.show", {
		user: 1,
		filter: "recent",
	});
	expect(withQuery).toBe("https://example.test/users/1?filter=recent");
});

test("throws when required parameters are missing", () => {
	const router = routerWithRoute();
	const generator = new UrlGenerator(router, "https://example.test");

	expect(() => generator.route("users.show")).toThrow(
		/Missing required parameter "user"/,
	);
});

test("can generate URLs from cached manifests", () => {
	const router = new Router();
	router.loadRouteManifest({
		"users.index": { uri: "/users", methods: ["GET"] },
	});
	const generator = new UrlGenerator(router, "https://example.test");

	const url = generator.route("users.index");
	expect(url).toBe("https://example.test/users");
});
