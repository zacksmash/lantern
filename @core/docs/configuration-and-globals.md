# Configuration, Env & Global Helpers

Lantern exposes Laravel-style helpers so you can read configuration or build responses anywhere without tedious imports.

## Environment variables
- `@core/Env.ts` defines a tiny `Env` helper. `env(key, fallback?)` reads from `process.env`, throws if missing, and is bound to `globalThis.env` during bootstrap.
- Use `env("APP_ENV", "development")` in config files to branch per environment.

## Configuration loader
- `@core/Config.ts` loads every `config/*.ts` module once on startup via `config.load()` (called in `@core/Globals.ts`). The default export (or module itself) should be a plain object.
- Environment overrides: create files like `config/app.production.ts`. When `NODE_ENV` is set, Lantern merges `<name>.<env>.ts` over the base config deep-recursively.
- Helpers: `config("app.name")` reads nested keys and is registered globally on `globalThis.config`.
- Caching: `config.cacheToFile()` writes the merged object to `storage/config.cache.json`. `config.loadFromCache()` skips `require` calls — ideal for production deploys.

```ts
// config/app.ts
export default {
	name: env("APP_NAME", "Lantern"),
	url: env("APP_URL", "http://localhost:3000"),
	timezone: "UTC",
};

// config/app.production.ts
export default {
	timezone: "America/New_York",
};
```

## Global response helpers
`@core/Globals.ts` runs before `HttpKernel` handles traffic. It registers:
- `globalThis.route` — proxy to the `UrlGenerator` (see `routing.md`).
- `globalThis.inertia` — renders Inertia responses (see `inertia.md`).
- `globalThis.view` — renders Blade-like templates (see `views.md`).

Because globals are set as early as possible, controllers, middleware, and even service providers can call these helpers without additional imports.

```ts
// app/controllers/ProfileController.ts
import type { HttpRequest } from "@core/Http/Request";

export class ProfileController {
	async show(request: HttpRequest) {
		const user = await request.validate({ id: "required|integer" });
		return inertia("Profile/Show", {
			user,
			settingsUrl: () => route("settings.edit", { user: user.id }),
		});
	}
}

// Anywhere else
const appName = config("app.name");
```
