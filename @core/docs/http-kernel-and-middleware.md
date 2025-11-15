# HTTP Kernel & Middleware

Lantern’s HTTP kernel mirrors Laravel’s responsibility chain: maintenance checks, static asset short-circuits, global middleware, and finally route dispatch.

## Kernel Flow

`@core/Http/Kernel.ts` handles each request:

1. **Maintenance mode** – Returns `503` if `storage/app/.maintenance` exists.
2. **Static assets** – Streams files from `public/` when the path matches, guarding against directory traversal.
3. **Middleware pipeline** – Builds a stack from the manifest (global → group → route-specific) and executes it.
4. **Router dispatch** – Calls `app.handleRequest(request)` at the end of the pipeline.

Static files are served before middleware for performance, just like Laravel’s `public/` directory.

## RequestContext

`HandleResponse` places each `HttpRequest` inside `RequestContext` (AsyncLocalStorage). Any code path can call `RequestContext.get()` or rely on helpers like `inertia()` and `view()` to access the current request.

## Middleware Manifest

Configure stacks in `@core/Http/Middleware/Manifest.ts`:

- **global** – Always runs. Defaults include `TrustProxies`, `HandleCors`, `PreventRequestsDuringMaintenance`, `ValidatePostSize`, `TrimStrings`, and `ConvertEmptyStringsToNull`.
- **groups** – Named stacks such as `web` and `api`. The `web` group mirrors Laravel’s cookie/session/CSRF stack; `api` applies bindings + `Throttle:api`.
- **aliases** – Map strings to middleware classes (e.g., `auth`, `signed`, `Throttle:api`). Use these names when attaching middleware to routes.

Middleware implement `handle(request, next)` and may inject dependencies via the container.

## Middleware Manager

`MiddlewareManager` resolves identifiers recursively:

- Strings resolve to group arrays or alias constructors.
- Arrays are flattened, preserving order.
- Classes are instantiated via the container so constructor injection works.
- Circular references throw descriptive errors.

Route middleware is appended after the global stack:

```ts
Route.middleware(["web", "auth"]).group(() => {
	Route.get("/dashboard", DashboardController).name("dashboard");
});

Route.get("/health", () => new Response("ok")).middleware(LoggerMiddleware);
```

## Creating Middleware

Use the `Middleware` interface from `@core/Http/Middleware/Contracts`:

```ts
import type { Middleware } from "@core/Http/Middleware/Contracts";

export class LoggerMiddleware implements Middleware {
	async handle(request, next) {
		const start = Date.now();
		const response = await next();
		console.log(request.method, request.path(), response.status, Date.now() - start);
		return response;
	}
}
```

Register the class as an alias or add it to a group in the manifest.

## Maintenance Workflow

```bash
touch storage/app/.maintenance   # enter maintenance
rm storage/app/.maintenance      # exit maintenance
```

The kernel checks for this file before running middleware, so responses stay consistent regardless of route or controller logic.

Lantern’s kernel/middleware setup should feel at home to Laravel developers: expressive manifests, convenient helpers, and a predictable order of execution.***
