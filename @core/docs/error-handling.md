# Error Handling & Responses

Lantern keeps error handling straightforward while leaving room for custom handlers.

## HandleError behavior
`@core/Application/ProcessRequest.ts` exports `HandleError`, which Bun calls whenever your `fetch` handler throws:
- `ValidationException` is intercepted and converted into a JSON `422` payload: `{ message, errors }`.
- In `APP_ENV=development`, other errors are rethrown so Bun prints full stack traces (and so tooling like the Bun inspector can pause on them).
- In non-development environments, Lantern returns `500 Internal Server Error` with a plain-text message. Customize this by wrapping `HandleError` or adding middleware that catches exceptions earlier.

## HTTP-level responses
- Maintenance mode returns `503` with a plain string (`"The application is under maintenance."`). Adjust `HttpKernel.checkForMaintenanceMode()` if you need a fancy page.
- Unmatched routes return `404 Not Found` from `Router.runRoute()`.
- Static file hits return the exact `Response` produced by `Bun.file()`.

## Logging
Use middleware (e.g., the built-in `LoggerMiddleware`) to log requests, errors, or metrics. Since the middleware stack wraps `app.handleRequest`, you can catch errors in a custom middleware and respond however you like.

## Custom exception handling
For richer error pages:
1. Add middleware that wraps `await next()` in a try/catch.
2. Detect exception types and render Inertia pages or Blade templates as needed.
3. Re-throw to let `HandleError` handle the rest, or swallow after constructing a `Response`.

```ts
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { ValidationException } from "@core/Validation/ValidationException";

export class ErrorPageMiddleware implements Middleware {
	async handle(request, next) {
		try {
			return await next();
		} catch (error) {
			if (error instanceof ValidationException) {
				return inertia("Errors/Validation", { errors: error.errors }, { status: 422 });
			}

			console.error("Unhandled error", error);
			return view("errors/500", { path: request.path() }, { status: 500 });
		}
	}
}

Route.middleware([ErrorPageMiddleware]).group(() => {
	Route.get("/settings", SettingsController);
});
```

Future improvements (see `codex-notes/gaps.md`) include view-based exception handlers and logging pipelines. Until then, use middleware and service providers to wire whatever error monitoring you prefer.
