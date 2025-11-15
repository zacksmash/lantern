# Error Handling

Lantern’s error handling pipeline mirrors Laravel’s default behaviour: validation errors become structured JSON, development mode surfaces stack traces, and production mode stays simple unless you override it.

## HandleResponse & HandleError

`@core/Application/ProcessRequest.ts` exports the two functions consumed by Bun:

- **HandleResponse** – wraps each Fetch `Request`, stores a custom `HttpRequest` inside `RequestContext`, and executes the middleware/kernel stack within a container scope.
- **HandleError** – final safety net that Bun calls whenever `HandleResponse` rejects.

HandleError logic:

| Condition | Behaviour |
| --- | --- |
| `ValidationException` | Returns `422` JSON `{ message, errors }`. |
| `APP_ENV=development` | Rethrows errors (so Bun prints stack traces / inspector works). |
| Other environments | Returns `500 Internal Server Error` with a generic message or the `Response` instance if the error already is one. |

Customize this by wrapping `HandleResponse` or adding middleware that intercepts errors earlier.

## HTTP Kernel Responses

- **Maintenance mode** – If `storage/app/.maintenance` exists, `HttpKernel` returns `503` before touching routes.
- **Static files** – Requests matching files in `public/` short-circuit to the file response. Directory traversal is prevented automatically.
- **Missing routes** – `Router.runRoute()` returns `404 Not Found`.

## Middleware-Based Error Pages

Like Laravel, you can register middleware to render bespoke error pages:

```ts
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { ValidationException } from "@core/Validation/ValidationException";

export class ErrorResponder implements Middleware {
	async handle(request, next) {
		try {
			return await next();
		} catch (error) {
			if (error instanceof ValidationException) {
				return inertia("Errors/Validation", { errors: error.errors }, { status: 422 });
			}

			console.error(error);
			return view("errors/500", { path: request.path() }, { status: 500 });
		}
	}
}
```

Attach the middleware globally or to specific route groups to control which endpoints receive custom handling.

## Logging

Lantern doesn’t prescribe a logger yet, but you can inject your own:

- Write a middleware that logs every request/response pair.
- Resolve a logging service in `HandleError` (wrap it yourself) or inside your middleware catch blocks.
- Hook into service providers to wire third-party monitoring (Sentry, Logtail, etc.).

## Testing Errors

Because `HandleError` emits simple `Response` objects, you can assert against status codes and payloads in tests using `bun test`. Throwing `Response` instances inside controllers/middleware lets you short-circuit without bubbling errors further.

Lantern keeps the error stack modest on purpose, giving you a predictable base while leaving room to layer more advanced exception handlers as your application grows.***
