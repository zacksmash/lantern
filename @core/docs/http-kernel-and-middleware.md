# HTTP Kernel & Middleware

The HTTP layer mirrors Laravel's pipeline: maintenance checks, static asset shortcuts, then middleware before your routes ever run.

## Kernel responsibilities
`@core/Http/Kernel.ts` receives the current `HttpRequest` and:
1. Returns a `503` when `storage/app/.maintenance` exists.
2. Streams any file inside `public` that matches the request path (after normalizing to prevent directory traversal).
3. Resolves middleware via `middlewareManager`, composes them right-to-left, and ends by calling `app.handleRequest(request)`.

Static files are served before middleware for performance. Use `public/` for compiled assets and uploads meant to be public.

## Request context
`HandleResponse` stores each `HttpRequest` inside `RequestContext` (AsyncLocalStorage). Middleware and controllers can call `RequestContext.get()` to access the active request without passing it manually.

## Middleware manifest
- Configure stacks in `@core/Http/Middleware/Manifest.ts`:
  - `global`: runs on every request (defaults to `LoggerMiddleware`).
  - `groups`: named stacks (e.g., `web`, `api`) you can reference from routes.
  - `aliases`: map strings to middleware classes so controllers can attach them declaratively.
- Middleware implement `handle(request, next)` and should return a `Response`.

```ts
// @core/Http/Middleware/AuthMiddleware.ts
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { RequestContext } from "@core/Application/RequestContext";

export class AuthMiddleware implements Middleware {
	async handle(_request, next) {
		const request = RequestContext.get();
		const token = request?.header("Authorization");
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}

		// Attach user info to scoped container/service here
		return next();
	}
}

// @core/Http/Middleware/Manifest.ts
import { LoggerMiddleware } from "@core/Http/Middleware/LoggerMiddleware";
import { AuthMiddleware } from "@core/Http/Middleware/AuthMiddleware";

export const MiddlewareConfig = {
	global: [LoggerMiddleware],
	groups: {
		web: ["logger"],
		api: ["auth"],
	},
	aliases: {
		logger: LoggerMiddleware,
		auth: AuthMiddleware,
	},
};
```

## Manager behavior
`MiddlewareManager` expands identifiers recursively:
- Strings resolve to either a group (array) or alias (single middleware). Circular references throw an error.
- Class constructors are passed directly to the container for instantiation.
- Route-level middleware (attached via `Route.middleware(...)`) is concatenated after globals.

```ts
Route.middleware(["web", "auth"]).group(() => {
	Route.get("/dashboard", DashboardController).name("dashboard");
});

Route.get("/health", () => new Response("ok")).middleware(LoggerMiddleware);
```

## Example: logger
`LoggerMiddleware` logs the method/URL before invoking `next()` and logs the response status afterward. Use it as a template for request timing, authentication, etc.

## Maintenance workflow
To put the app in maintenance mode:
```bash
touch storage/app/.maintenance
```
All requests immediately return `503`. Remove the file to resume service.
