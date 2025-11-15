# HttpRequest & Request Context

`@core/Http/Request.ts` wraps Bun’s Fetch `Request` with Laravel-like helpers so controllers and middleware can read input without re-parsing bodies.

## Core accessors
- `request.method` — uppercase HTTP method.
- `request.urlInstance` — the native `URL` for advanced parsing.
- `request.path()` — normalized path (`/` has no trailing slash).
- `request.header(name)` / `request.headers()` — read headers.

## Query parameters
- `request.query()` returns a `Record<string, string | string[]>` with duplicate keys promoted to arrays.
- `request.query("page", "1")` reads an individual key.

## Body helpers
The body is parsed once and cached per request.
- `await request.json()` or `request.body()` – returns JSON, form-urlencoded, or multipart data as plain objects. File uploads are surfaced as `File` instances when using multipart forms.
- `await request.all()` – merges query + body (body wins when keys collide).
- `await request.input()` – returns the merged payload, or `await request.input("email")` for a single key with optional fallback.

```ts
export class UploadController {
	async store(request: HttpRequest) {
		const body = await request.body<{ avatar: File; bio: string }>();
		const params = request.params();
		const all = await request.all();

		console.log(request.method, request.path());
		console.log("User:", params.userId);
		console.log("Form data:", all);

		return new Response(`Uploaded ${body.avatar.name} successfully`);
	}
}
```

## Route data
- `request.params()` exposes route parameters populated by the router.
- `request.route()` returns the matched `Route` instance, or `null` if none matched.
- `request.getRouteMatch()`/`assignRouteMatch()` are used internally to cache matches.

## Validation shortcut
- `await request.validate(rules)` runs the Validator (see `validation.md`) on the merged payload and returns sanitized values. Failed validations throw `ValidationException` and automatically produce a JSON `422`.

```ts
const data = await request.validate({
	email: "required|email",
	age: "nullable|integer|min:18",
});
```

## Raw access
- `request.getRawRequest()` returns the underlying Fetch `Request` for low-level APIs.

## RequestContext
Use `RequestContext.get()` anywhere (services, helper functions) to retrieve the `HttpRequest` tied to the current async call chain. This powers the global `inertia()` helper and lets you access request data without threading it through every function.

```ts
import { RequestContext } from "@core/Application/RequestContext";

export const currentRequest = () => {
	const request = RequestContext.get();
	if (!request) {
		throw new Error("No active request");
	}

	return request;
};

// Later
const locale = currentRequest().header("x-locale") ?? "en";
```
