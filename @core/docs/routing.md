# Routing & Controllers

Lantern's router (`@core/Routing/Router.ts`) offers Laravel-style expressiveness while running entirely on Bun.

## Defining routes
- Edit `routes/index.ts` and use the `Route` facade (resolved from the container).
- HTTP verbs: `Route.get`, `post`, `put`, `patch`, `delete`, `options`, `head`, `match([...])`, and `any()`.
- Actions can be:
  - A controller class with an `invoke` method (instantiated via the container).
  - A tuple `[ControllerClass, "methodName"]`.
  - A plain function `(request) => Response`.
  - A string method name when inside `Route.controller(...).group(...)`.
- Resource helpers: `Route.resource("users", UsersController)` scaffolds index/create/store/show/edit/update/destroy routes with conventional URIs and names.

## Controllers
- Place controllers in `app/controllers`. Export classes with `invoke(request)` or additional methods (`index`, `store`, etc.).
- Controllers resolved via the router can use constructor injection if decorated with `@Injectable()`.

```ts
import { Injectable } from "@core/Container/Decorators";
import type { HttpRequest } from "@core/Http/Request";
import { UserService } from "@app/services/UserService";

@Injectable()
export class UsersController {
	constructor(private users: UserService) {}

	async index() {
		return inertia("Users/Index", {
			users: () => this.users.all(),
		});
	}

	async show(request: HttpRequest) {
		const user = await this.users.find(Number(request.params("user")));
		return view("users/show", { user });
	}
}

Route.resource("users", UsersController);
```

## Route groups & attributes
Use facades or direct router methods to stack modifiers:
```ts
Route.middleware(["web", AuthMiddleware])
	.prefix("admin")
	.name("admin.")
	.controller(AdminController)
	.where({ id: /[0-9]+/ })
	.group(() => {
		Route.get("/dashboard", "index")
			.middleware("can:view-admin");
	});
```
- `prefix` prepends URL segments (automatically normalizes slashes).
- `name` prefixes route names.
- `middleware` accepts aliases, groups, or constructors.
- `where` assigns regex constraints to parameters.
- `controller` lets you specify actions via string method names inside the group.

## Parameters & patterns
- Declare parameters with `{user}`. Add `?` for optional segments (`{post?}`).
- `route.params()` returns an object of matched values. Optional segments collapse (no trailing slash) when missing.
- Use `route.where({ user: "[0-9]+" })` or pass a `RegExp` to enforce formats.

## Middleware aliases
`Router.aliasMiddleware(alias, MiddlewareClass)` lets you add runtime aliases. Framework defaults come from `@core/Http/Middleware/Manifest.ts` (e.g., `logger`).

```ts
import { app } from "@root/bootstrap/app";

app.router.aliasMiddleware("throttle", ThrottleMiddleware);

Route.get("/api/data", ApiController)
	.middleware(["api", "throttle"])
	.name("api.data");
```

## Naming & URL generation
- Chain `.name("users.show")` on routes. Names automatically respect the current group's `name()` prefix.
- `globalThis.route(name, params?, absolute = true)` resolves URLs via `UrlGenerator`. Required params must be provided, optional ones collapse, and leftover data becomes query strings.
- `UrlGenerator` uses `APP_URL` as its base. Pass `{ absolute: false }` to produce relative paths.

```ts
const profileUrl = route("users.show", { user: 42 });
const editUrl = route("users.edit", { user: 42 }, false); // -> /users/42/edit
```

## Route manifests & caching
- `router.getRouteManifest()` returns `{ name: { uri, methods } }`, ideal for writing to disk in a future `route:cache` command.
- `router.loadRouteManifest(manifest)` lets you hydrate the map without re-registering routes at runtime.

```ts
import { app } from "@root/bootstrap/app";
import { writeFileSync } from "node:fs";

const manifest = app.router.getRouteManifest();
writeFileSync("bootstrap/cache/routes.json", JSON.stringify(manifest));

// Later at boot
app.router.loadRouteManifest(JSON.parse(readFileSync(...).toString()));
```

## Error handling
If no route matches, Lantern returns a `404` `Response("Not Found")`. Add a catch-all route if you want custom behavior.
