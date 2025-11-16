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
Route.get("/users/{user}", [UserController, "show"]);
```

Define bindings via `Route.bind` or `Route.model`; bound values are injected before the controller executes.

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
