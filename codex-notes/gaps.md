# Open Work & Questions

## Server

- **Request validation rules** — Only a subset of Laravel rules exist (`required`, `nullable`, `string`, `integer`, `boolean`, `array`, `email`, `min`, `max`, `in`, `regex`). Plan which advanced rules (confirmed, unique, exists, date, file, etc.) matter most and how they will interface with the eventual ORM/database layer.
- **Dependency injection ergonomics** — Constructor metadata + `@Inject` cover most cases now, and we’ve introduced typed tokens via `createToken`, but there is still no contextual binding or interface auto-aliasing. Decide whether to add helpers for interface contracts, conditional bindings, or decorators that automatically register implementations.
- **Storage/disks** — `storage/app/{public,private}` mirrors Laravel but there is no filesystem abstraction yet. Define disk interfaces before adding features depending on uploads.
- **Error handling** — `HandleError` only rethrows during development, returning a generic message in production. Plan how to integrate a view-based exception handler, logging, and HTTP exceptions.
- **Middleware configuration surfaces** — Middleware aliases/groups live in a TypeScript manifest. There’s no per-environment customization, priority sorting, or CLI tooling to inspect/cache stacks. Evaluate whether middleware should support priorities, environment-specific configs, or artisan-style commands.
- **Route manifest tooling** — The router can export/import route manifests, but there’s no CLI (`route:cache`) to dump/load them for production. Decide how to persist manifests (e.g., JSON under `bootstrap/cache`) and expose helpers to warm the cache at deploy time.

## Frontend

- **Hydration entry point** — `assets/index.html` uses Blade-style `@vite` / `@inertia` placeholders but there is no server-side renderer replacing them yet. Clarify whether Bun will stream HTML directly or if SSR is planned.
- **Inertia page loading** — `assets/js/app.ts` uses `import.meta.glob(..., { eager: true })`, which will bundle every page into the main chunk. Consider lazy loading via async components for better performance once more pages exist.

## Tooling & DX

- **Testing story** — We now have unit coverage for the router and request validation, but still need higher-level HTTP/integration tests to exercise the middleware stack, kernel, and real controllers.
- **CLI ergonomics** — There is no artisan-style CLI. Determine whether Bun scripts or a dedicated command runner should exist for migrations, config caching, etc.
