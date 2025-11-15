# Extension Playbook

## Routes & controllers

- Define controllers inside `app/controllers`. Export a class with either an `invoke` method (auto-resolved) or explicit handler methods (`show`, `store`, etc.).
- Register HTTP verbs in `routes/index.ts` using the router facade: `Route.get("/users/{user}", ShowUserController).name("users.show")`. Parameters use `{name}` syntax with optional segments written as `{name?}`.
- Route groups mirror Laravel: `Route.middleware("auth").prefix("admin").name("admin.").group(() => { ... });`. You can also use `Route.controller(UserController).group(() => Route.get("/users", "index"));` for shorthand controller methods, and `Route.where({ user: "[0-9]+" })` to set constraints.
- `Route.resource("users", UsersController)` scaffolds the canonical resource routes. The router also exposes `match` and `any` helpers.
- Use the global `route("users.show", { user: 123 })` helper (or resolve the `UrlGenerator` from the container) to build URLs from named routes. Missing required parameters throw helpful errors, optional segments collapse automatically, and remaining values become query parameters.
- Render responses with `inertia("Users/Index", props)` for SPA visits or `view("welcome", data)` for Blade-style pages. The helpers automatically inject Vite assets, Inertia headers, and perform template interpolation.
- Decorate controllers or middleware that rely on constructor injection with `@Injectable()` so TypeScript emits metadata. Use `@Inject(Token)` on individual constructor parameters when you need to bind interfaces, named tokens, or override the inferred type.

## Middleware

- Global middleware live in `@core/Http/Middleware/Manifest.ts`. Configure the `global` array (runs every request), `groups` (named stacks such as `web` or `api`), and `aliases` so routes can reference middleware by string or class.
- Route-specific middleware can be attached via `.middleware("auth")`, `.middleware(["web", AuthMiddleware])`, or `.middleware([AuthMiddleware])`. The `MiddlewareManager` expands aliases/groups and instantiates classes through the container so dependencies declared with `static inject = []` are respected automatically.
- Middleware implement `handle(request, next)` and should be stateless. Use `RequestContext.get()` inside middleware to fetch the active `HttpRequest` if needed.

## Service providers & container bindings

- Application-specific providers belong under `app/providers` and must be exported from `bootstrap/providers.ts`.
- Providers can call `this.app.singleton("key", () => instance)` or `this.app.bind` during `register` to expose services. Any boot-time tasks (loading routes, configuring jobs, warming caches) belong in `boot`.
- The container supports binding by token (string, symbol, or class) and constructor injection via parameter types and the `@Inject(Token)` decorator (e.g., `constructor(@Inject(CacheToken) cache: Cache)`). Create strongly typed tokens via `createToken<T>("description")` instead of hard-coded strings so IDEs can help. Use `static inject` only when decorators/metadata aren’t available. Register request-scoped services with `container.scoped(Token, factory)` and they’ll be resolved once per HTTP request, thanks to the scoped lifecycle around `HandleResponse`.

## Configuration, request data & validation

- Configuration lives in `/config/*.ts` and is loaded automatically from `@core/Globals.ts`. Files export plain objects and can reference environment variables with the global `env()` helper.
- Environment-specific overrides can be added as `config/app.development.ts`, etc. `Config.load` merges base + environment at startup and you can cache the merged output to `storage/config.cache.json` for production.
- Use the global `config("app.name")` helper inside runtime code to read values.
- Routing + controller handlers receive an instance of `HttpRequest` (`@core/Http/Request`). Use `request.input()`, `request.query()`, `request.params()`, `request.route()`, and `request.getRawRequest()` to access inbound data.
- Call `await request.validate({ email: "required|email", age: "required|integer|min:18" })` to run Laravel-style validation. The helper returns sanitized data (with type casts for numbers/booleans) or throws a `ValidationException` that the kernel converts into a JSON 422 response automatically.

## Cache & Redis

- Configure stores via `config/cache.ts`. Out of the box there is a `memory` store and a Bun-powered `redis` store; change `default` or call `CacheManager.store("redis")` explicitly.
- Resolve the cache manager with `container.resolve(ContainerTokens.CacheManager)` or use dependency injection. Repositories expose `get`, `put`, `remember`, `forever`, and `forget`.
- Redis options honor `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, etc., and use Bun’s native client so there’s no npm dependency to maintain.

## Sessions & authentication

- `HttpRequest` exposes `cookies()`, `session()`, `user()`, and `setAttribute()` helpers so middleware/controllers can coordinate state.
- Use the `web` middleware group on routes that need session/auth/CSRF support. It automatically encrypts cookies, persists sessions, shares validation errors, verifies tokens, and appends queued cookies before returning the response.
- Resolve `AuthManager` via `ContainerTokens.AuthManager` to check the current user or perform programmatic logins. The default guard stores user payloads inside the session under `auth_user`.
- Middleware aliases (`auth`, `auth.basic`, `auth.session`, `guest`, `password.confirm`, `signed`, `verified`, `throttle`, `Throttle:api`) mirror Laravel naming so you can decorate routes the same way.

## Database access

- Configure connections in `config/database.ts`. Drivers map to Bun's SQL adapters: `"sqlite"`, `"mysql"`, and `"pgsql"` (`postgres`).
- Resolve `DatabaseManager` via `container.resolve(ContainerTokens.DatabaseManager)` or call the global `db()` helper. The helper returns Bun's SQL client, so you can run template literal queries, transactions, and connection pooling exactly as Bun documents.
- Add additional named connections (e.g., `reporting`, `analytics`) and switch via `db("analytics")`.

## Frontend assets (quick reference)

- Entry point: `assets/js/app.ts` boots Inertia + Vue 3, auto-registering pages from `assets/js/Pages`.
- Vite configuration (`vite.config.ts`) loads the custom Lantern plugin, Tailwind's Vite adapter, and Vue's SFC plugin. Update `lantern({ input })` if new entry points are added.
- CSS lives in `assets/css/app.css` and currently relies on Tailwind v4's `@tailwindcss/vite` plugin.
