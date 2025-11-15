# Architecture Overview (Updated)

This note tracks the current Lantern architecture so future Codex tasks have up-to-date context.

## Runtime Flow

1. **Bootstrap** – `lantern.ts` registers `HandleResponse` / `HandleError` as Bun’s fetch handlers.
2. **RequestContext** – `HandleResponse` wraps each Fetch `Request` inside `RequestContext.run(...)`, creating an `HttpRequest` wrapper that exposes Laravel-style helpers.
3. **Scoped Container** – `app.getContainer().runScope` ensures every request receives isolated scoped services (sessions, per-request caches, etc.).
4. **HttpKernel** – Checks for maintenance mode, serves static files from `public/`, expands middleware (global + group + route), then dispatches to `app.handleRequest`.
5. **Application / Router** – `Application` delegates to the `Router`, which matches routes, resolves controllers via the container, and invokes controller methods/closures.
6. **Responses** – Controllers commonly return Inertia responses or HTML views. `HandleError` acts as the final safety net for uncaught exceptions.

## Container & Providers

- `Application.configure(basePath)` binds the app + container tokens, registers framework providers (`Cache`, `Encryption`, `Session`, `Auth`, `Database`, `Routing`), then boots them.
- Providers extend `ServiceProvider` with `register()` (bindings) and `boot()` (side effects such as loading routes or warming caches).
- The container now exposes typed helpers: `bind`, `singleton`, `scoped`, `instance`, guarded resolution, and circular dependency detection. `@Injectable()` + `@Inject(Token)` wire constructor injection.
- Scoped bindings are critical: the HTTP kernel always runs inside `container.runScope`, so per-request services (like request caches) remain isolated.

## Routing & Middleware

- Routes live in `routes/index.ts` via the `Route` facade. Verbs, groups, resources, and parameter constraints match Laravel semantics (`prefix`, `middleware`, `name`, `controller`, `where`).
- Middleware stacks are declared in `@core/Http/Middleware/Manifest.ts`. The manager resolves aliases/groups into concrete classes using the container so constructor injection works inside middleware too.
- The `Router` keeps a manifest of named routes for eventual caching and drives the `UrlGenerator` used by the global `route()` helper.

## Request Object

`HttpRequest` wraps Bun’s request with helpers:

- Query + body parsing (JSON, form-urlencoded, multipart) with caching.
- `input`, `all`, `params`, `route`, `validate` (dot-notation aware).
- `cookies()` returns a `CookieJar` with queueing, encryption, and HTTP-only helpers.
- `session()` exposes the current `Session`, including flash data utilities.
- `user()` / `setUser()` interact with the auth guard.
- Arbitrary attributes allow middleware to stash data for later stages.

Everything is request-aware thanks to `RequestContext`.

## Validation

`@core/Validation/Validator.ts` implements Laravel-like rules (`required`, `nullable`, `string`, `integer`, `boolean`, `array`, `email`, `min`, `max`, `in`, `regex`) plus custom callbacks. Controllers typically call `await request.validate(rules)`. Failures throw `ValidationException`, and `HandleError` converts it into a `422` JSON payload.

## Cache, Session & Auth

- `CacheManager` supports memory, Redis, and SQL-backed stores. Repositories expose `get`, `put`, `forever`, `remember`, `forget`.
- `SessionManager` uses the cache driver for persistence and handles cookie issuance, flash data, and request tokens. Cookie encryption happens via `EncryptCookies`.
- `AuthManager` implements a session guard (`web`) with middleware aliases (`auth`, `guest`, `auth.basic`, etc.). User records are serialized into the session, mirroring Laravel’s session guard behaviour.

## Database

`DatabaseManager` wraps Bun’s `SQL` client, providing named connections (`sqlite`, `mysql`, `pgsql`). The `db()` facade returns the raw SQL template tag so you can run queries directly.

## Rendering

- **Inertia** – `InertiaResponseFactory` matches the official Inertia spec (partial reloads, versioning via `ViteAssetTagGenerator.getVersion()`, merge/scroll metadata). Props can be wrapped with helper descriptors (`optional`, `always`, `defer`, `merge`, `scroll`).
- **Views** – `ViewEngine` loads HTML templates under `resources/views`, interpolates `{{ }}` expressions, and swaps `@vite` tokens for the correct script/link tags. The global `view()` helper returns a ready-made `Response`.
- **Assets** – The custom Vite plugin writes `public/hot` during dev and reads `public/build/manifest.json` during production so `@vite` replacements stay in sync.

## Storage & Maintenance

- `public/` hosts static assets; `HttpKernel` serves them before middleware.
- `storage/app` houses runtime data plus the `.maintenance` toggle. Config caches can live under `storage/config.cache.json`.

## Error Handling

- `HandleError` turns `ValidationException` into JSON 422 responses, bubbles errors in development, and emits a generic 500 in production unless you add middleware to override it.
- Middleware can wrap `await next()` in try/catch to render custom error pages or log exceptions before they reach `HandleError`.

This snapshot should keep Codex aligned with the current framework state whenever you modify or extend Lantern.\*\*\*
