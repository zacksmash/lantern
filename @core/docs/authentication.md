# Authentication & Sessions

Lantern borrows heavily from Laravel’s session-based authentication model. The framework ships with encrypted cookies, session storage, CSRF protection, and the familiar `auth`/`guest` middleware stack.

## Configuration Files

| File | Responsibility |
| --- | --- |
| `config/session.ts` | Cookie name, cache driver, lifetime, domain/path, secure flags, encryption exceptions. |
| `config/auth.ts` | Default guard, guard definitions, user providers, redirect targets for guest/authenticated routes. |

```ts
// config/auth.ts
export default {
	defaults: { guard: "web" },
	guards: {
		web: { driver: "session", provider: "users" },
	},
	providers: {
		users: {
			driver: "array",
			identifier: "email",
			users: [
				// { id: 1, email: "user@example.com", password: "$2b$..." }
			],
		},
	},
};
```

Sessions are persisted through the cache layer (`config/cache.ts`). Swap drivers in that file to move from in-memory storage to Redis or SQL.

## Service Providers

During bootstrap, Lantern registers:

1. **CacheServiceProvider** – binds `CacheManager`.
2. **EncryptionServiceProvider** – creates the AES-GCM `Encrypter` using `APP_KEY`.
3. **SessionServiceProvider** – binds `SessionManager` and starts/saves sessions around each request.
4. **AuthServiceProvider** – binds `AuthManager`, session guard, and auth middleware aliases.

## Request Helpers

`HttpRequest` exposes everything you expect:

- `request.cookies()` – `CookieJar` for reading and queuing cookies.
- `request.session()` – Returns the `Session` instance or `null` outside the `StartSession` middleware.
- `request.user<T>()` / `request.setUser()` – Access or override the authenticated user object.

Controllers can also resolve `AuthManager` directly via DI or use the `auth()` facade.

## Middleware Stack

The default `web` group defined in `@core/Http/Middleware/Manifest.ts` executes:

1. `EncryptCookies`
2. `AddQueuedCookiesToResponse`
3. `StartSession`
4. `ShareErrorsFromSession`
5. `VerifyCsrfToken`
6. `SubstituteBindings` (reserved for future implicit bindings)

Middleware aliases mirror Laravel:

| Alias | Description |
| --- | --- |
| `auth`, `auth.session` | Require an authenticated user. |
| `auth.basic` | HTTP Basic guard backed by configuration credentials. |
| `guest` | Redirect authenticated users away from guest routes. |
| `password.confirm` | Require a recent password confirmation timestamp. |
| `signed` | Validate signed URLs created via the `URL` facade. |
| `throttle`, `Throttle:api` | Apply rate limiting. |
| `verified` | Placeholder hook for email verification flows. |

Attach them via `Route.middleware("auth")` or groups like `Route.middleware(["web", "auth"])`.

## AuthManager & SessionGuard

`AuthManager.guard(name?)` currently exposes the `session` guard. It serializes user payloads into the session under `auth_user` and hydrates them on subsequent requests.

```ts
import { auth } from "@core/Support/Facades/Auth";

Route.get("/dashboard", async () => {
	const user = auth().user();
	return user ? inertia("Dashboard", { user }) : Response.redirect("/login");
}).middleware(["web", "auth"]);
```

### Attempting Authentication

```ts
const success = await auth().attempt({
	email: request.input("email"),
	password: request.input("password"),
});

if (!success) {
	request.session()?.flash("errors", { email: "Invalid credentials" });
	return Response.redirect("/login");
}

return Response.redirect("/dashboard");
```

- Hash passwords with `await Hash.make("secret")` (bcrypt). The bundled array provider compares using `Hash.verify`.
- Successful attempts regenerate the session ID for fixation protection.
- Use `auth().login(user)` to persist a user object manually (e.g., after registration) and `auth().logout()` to clear it.

### Basic Auth & Password Confirmation

- `auth.basic` middleware checks `Authorization: Basic ...` headers against env credentials and hydrates `request.user()` on success.
- `password.confirm` middleware ensures `session.get("password_confirmed_at")` is recent. Set this timestamp yourself after verifying the password.

### Signed URLs

`route("signed", params, true)` can be wrapped with `URL().signedRoute(...)` to append a `signature`/`expires` pair. The `signed` middleware verifies the hash using `APP_KEY` and optional expiration.

## Flash Data & CSRF

- `session.flash("key", value)`, `session.now(...)`, `session.reflash()` mirror Laravel’s flash API.
- `VerifyCsrfToken` issues an `XSRF-TOKEN` cookie and checks `_token` or `X-XSRF-TOKEN` on unsafe verbs, returning HTTP 419 on failure.

Lantern’s auth stack intentionally feels like Laravel: configuration-driven guards/providers, expressive middleware aliases, and helpers for sessions, flash data, and CSRF protection.***
