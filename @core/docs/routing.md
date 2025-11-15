# Routing

Lantern’s router looks and feels like Laravel’s. You define routes in `routes/index.ts` using the `Route` facade, the container resolves controllers, and URL generation works through a shared `UrlGenerator`.

## Defining Routes

```ts
import { Route } from "@core/Support/Facades/Route";
import { HomeController } from "@app/controllers/HomeController";

Route.get("/", HomeController).name("home");
Route.post("/contact", [HomeController, "store"]).name("contact.store");
```

Supported verbs: `get`, `post`, `put`, `patch`, `delete`, `options`, `head`, `match([...])`, and `any()`.

### Controllers

- `Route.get("/dashboard", DashboardController)` resolves the controller and calls its `invoke` method.
- `[ControllerClass, "method"]` calls the specified method.
- Route groups may call `Route.controller(ControllerClass).group(...)` so inner routes can use string methods (`"index"`, `"store"`, etc.).
- Controllers support constructor injection via `@Injectable()` or `static inject = [...]`.

### Route Groups

```ts
Route.middleware(["web", "auth"])
	.prefix("admin")
	.name("admin.")
	.controller(AdminController)
	.where({ id: /[0-9]+/ })
	.group(() => {
		Route.get("/dashboard", "index");
		Route.get("/users/{id}", "show");
	});
```

Group helpers mirror Laravel:

| Helper | Description |
| --- | --- |
| `middleware(...)` | Accepts aliases, groups, or constructors. |
| `prefix("admin")` | Prepends URI segments (auto-normalized). |
| `name("admin.")` | Prefixes route names. |
| `controller(Class)` | Default controller for nested string routes. |
| `where({ param: pattern })` | Regex constraints for parameters. |

### Parameters

- `{user}` defines a required parameter; `{post?}` makes it optional.
- Constraints can be strings or `RegExp` instances.
- `request.params()` exposes matched values.

### Resources

`Route.resource("users", UsersController)` scaffolds conventional CRUD routes with names like `users.index`, `users.show`, etc.

## Middleware

Attach middleware via strings (aliases) or classes:

```ts
Route.get("/profile", ProfileController)
	.middleware(["web", "auth", "verified"])
	.name("profile.show");
```

Aliases are declared in `@core/Http/Middleware/Manifest.ts`. You can register new aliases at runtime with `router.aliasMiddleware("custom", CustomMiddleware)`.

## Naming & URLs

Chain `.name("users.show")` to assign route names. Generate links using the global `route()` helper or `URL` facade:

```ts
const url = route("users.show", { user: 42 }); // absolute
const relative = route("users.edit", { user: 42 }, false); // /users/42/edit
```

Missing required parameters throw descriptive errors. Extra parameters become query strings.

## Route Manifests

`router.getRouteManifest()` returns `{ name: { uri, methods } }`. Write it to disk to build route caches. Later, call `router.loadRouteManifest(manifest)` to hydrate the lookup map without registering every route (useful for CLI tools or tests).

## Fallbacks

Unmatched requests return `404 Not Found`. Add a catch-all route (`Route.any("/{path}", ...).where({ path: ".*" })`) if you want custom behaviour.

Lantern’s routing DSL intentionally replicates Laravel’s, so porting routes or controllers requires minimal changes.***
