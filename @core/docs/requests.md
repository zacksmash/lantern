# Requests

Lantern wraps Bun’s Fetch API in an `HttpRequest` class that feels like Laravel’s request object: cached bodies, convenient helpers, and access to sessions, cookies, and the authenticated user.

## Core APIs

| Helper | Description |
| --- | --- |
| `request.method` | Uppercase HTTP verb. |
| `request.urlInstance` | Native `URL` object for advanced parsing. |
| `request.path()` | Normalized path without trailing slashes. |
| `request.header(name)` / `request.headers()` | Read headers. |

### Query Parameters

```ts
request.query(); // Record<string, string | string[]>
request.query("page", "1"); // single value with fallback
```

Duplicate keys are promoted to arrays automatically.

### Body Helpers

The body is parsed once and cached:

- `await request.json()` / `request.body()` – returns JSON, form-urlencoded, or multipart payloads as plain objects (multipart files remain `File` instances).
- `await request.all()` – merges query + body (body wins on conflicts).
- `await request.input()` – returns the merged payload, or `await request.input("email", "guest@example.com")` for a single key.

```ts
const data = await request.input<{ name: string; avatar?: File }>();
```

### Route Data

`request.params()` exposes route parameters, and `request.route()` returns the matched `Route` instance. Internally Lantern caches matches so repeated lookups are cheap.

## Validation

`await request.validate(rules)` runs the Validator (see `validation.md`) against `request.all()` and returns sanitized data. Failures throw `ValidationException`, which `HandleError` turns into a `422` JSON response.

```ts
const payload = await request.validate({
	email: "required|email",
	password: "required|string|min:8",
});
```

## Cookies & Sessions

- `request.cookies()` returns the `CookieJar`. Call `cookies.get("name")` or queue values via `cookies.queue(name, value, options)`. Encryption happens automatically unless the cookie is listed in `config/session.encrypt_except`.
- `request.session()` returns the current `Session` instance (or `null` if `StartSession` hasn’t run). Sessions support `get`, `put`, `flash`, `remember`, etc.

## Authentication

- `request.user<T>()` returns the authenticated user set by the session guard.
- `request.setUser(user)` lets middleware override the current user object (e.g., after verifying HTTP Basic credentials).

## Attributes

`request.setAttribute(key, value)` / `getAttribute(key)` provide a lightweight way to share data between middleware and downstream handlers. Session errors, throttling metadata, and other transient bits flow through attributes.

## Raw Access

Need low-level control? `request.getRawRequest()` returns the original Fetch `Request` so you can stream bodies, clone, or interact with APIs that expect the native object.

## RequestContext

`RequestContext` (AsyncLocalStorage) lets you retrieve the current request from anywhere:

```ts
import { RequestContext } from "@core/Application/RequestContext";

export const currentRequest = () => {
	const request = RequestContext.get();
	if (!request) throw new Error("No active request");
	return request;
};
```

Helpers like `globalThis.inertia` and `globalThis.route` rely on `RequestContext`, mirroring Laravel’s ability to access the current request from facades or helper functions.

Lantern’s request object intentionally feels the same as Laravel’s, so migrating controllers or middleware is largely copy/paste.***
