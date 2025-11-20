# Routing

Lantern mirrors Laravel’s router with expressive route registration, middleware grouping, and resource helpers.

## Basic Routes

```ts
import { Route } from "@core/Support/Facades/Route";
import { HomeController } from "@app/Controllers/HomeController";

Route.get("/", () => "Welcome home");

Route.get("/dashboard", HomeController).name("dashboard");

Route.post("/users", [UserController, "store"]).name("users.store");
```

- Closures may return any `ResponseValue` (string, object, `Response`, etc.); Lantern wraps them via the shared `ResponseFactory`.
- Passing a controller class without a method calls its `invoke()` method. Use `[Controller, "method"]` to target specific actions.

## Middleware, Prefixes, and Namespaces

```ts
Route.prefix("/admin")
  .name("admin.")
  .middleware(["auth", "verified"])
  .group(() => {
    Route.get("/dashboard", AdminController).name("dashboard");
  });
```

Group attributes cascade (prefix, name, namespace, controller, middleware) just like Laravel.

## Route Model Binding

```ts
Route.bind("user", async (id) => User.findOrFail(id));
Route.get("/users/{user}", [UserController, "show"]).missing(() => {
  return HttpResponse.redirect("/users");
});

Route.model("post", Post);
Route.get("/posts/{post}", [PostController, "show"]);

// Typed access inside controllers/middleware
request.route<Post>("post"); // fully-hydrated model
```

Define bindings via `Route.bind` or `Route.model`; bound values are injected before middleware or the controller executes. When a binding throws (or resolves `undefined`/`null`), Lantern now raises a `ModelNotFoundHttpException` and returns a `404` by default. Attach `route.missing(callback)` to customize that fallback response per route.

### Named Routes & Lookups

```ts
Route.get("/dashboard", DashboardController).name("dashboard");

if (Route.has("dashboard")) {
  const dashboardRoute = Route.routesByName().get("dashboard");
  const url = Route.toUrl("dashboard", {}, false); // "/dashboard"
}

Route.currentRouteName();   // available during a request lifecycle
Route.currentRouteAction(); // returns the controller/closure reference
```

Lantern maintains an in-memory map of every named route so you can quickly check that a route exists (`Route.has`) or introspect metadata (`Route.routesByName()`). The current match is also exposed for middleware/controllers via `Route.currentRouteName`, `Route.currentRouteAction`, and `Route.matchedRoute()`.

### Route Constraints & Global Patterns

```ts
Route.pattern("user", "[0-9]+"); // applies to future routes

Route.get("/users/{user}", UserController.show);      // must be numeric
Route.get("/songs/{song:uuid}", SongController.show)  // inline constraint coming soon
  .whereUuid("song");

Route.get("/photos/{photo}", PhotoController.show)
  .where({ photo: "[A-Z]{2}[0-9]{4}" });
```

`Route.where` (and the convenience helpers `whereNumber` / `whereUuid`) constrain one or more parameters so they only match when the regex succeeds. `Route.pattern` / `Route.patterns` register global defaults that apply to every subsequently-declared route using that placeholder.

### Fallback & Redirect/View Helpers

```ts
Route.redirect("/home", "/dashboard");
Route.view("/about", "About", { team: [] });

Route.fallback(() => Inertia.render("Errors/NotFound"));
```

- `Route.redirect` registers a lightweight redirect without creating a controller.
- `Route.view` lets you quickly return a server-driven view/props payload (perfect for Inertia placeholders until dedicated helpers ship).
- `Route.fallback` defines the 404 handler when no route matches; it executes after middleware groups, just like any other route.

### URL Generation & Route Caching

```ts
// Absolute URL (origin inferred from current request when available)
route("users.show", { user: 1 }); // helper, returns "http://localhost/users/1" in tests

// Relative path
Route.toUrl("users.show", { user: 1 }, false); // "/users/1"

// With query strings and fragments
Route.toUrl("users.show", { user: 1, query: { tab: "details" }, fragment: "bio" });
// => "http://localhost/users/1?tab=details#bio"

// Persist route metadata to disk for tooling / introspection
Route.cacheRoutes("storage/framework/routes.json");
Route.loadCachedRoutes("storage/framework/routes.json");
```

`Route.toUrl` (and the `route()` helper) mirror Laravel’s URL generator: interpolate required parameters, drop optional segments when omitted, and fall back to `http://localhost` if no request context is active. `Route.cacheRoutes`/`loadCachedRoutes` serialize route metadata (methods, URI, name, middleware) for offline inspection and debugging; cached payloads are not a substitute for loading route definitions when dispatching requests.

## Resource & API Resource Routes

```ts
Route.resource("photos", PhotoController);
Route.apiResource("photos.comments", PhotoCommentController);
Route.resources({
  posts: PostController,
  users: UserController,
});
```

Nested resources follow Laravel’s naming (`photos/{photo}/comments`). Use `apiResource`/`apiResources` to register stateless routes (no `create`/`edit` endpoints).

## Route Files & Middleware Groups

`routes/web.ts` and `routes/api.ts` are loaded automatically based on `app.withRouting()`. The router wraps them in the configured middleware groups:

- Web routes receive the `web` stack (cookies, session, CSRF, etc.).
- API routes receive the `api` stack and an `/api` prefix by default.

Adjust the middleware stacks through `app.withMiddleware(...)` and register additional routes anywhere via `Route` facade calls.
