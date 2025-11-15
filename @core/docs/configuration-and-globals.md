# Configuration, Environment & Globals

Lantern inherits Laravel’s philosophy around configuration and global helpers. All configuration lives in `config/*.ts`, helpers are registered early, and environment variables flow through a dedicated `env()` utility.

## Environment Helper

`@core/Env.ts` exports `env(key: string, fallback?: string)` and registers it as `globalThis.env`:

- Reads straight from `process.env`.
- Throws when required keys are missing (no fallback supplied).
- Normalizes newlines for multi-line secrets.

Use it inside config files or providers just as you would in Laravel:

```ts
export default {
	name: env("APP_NAME", "Lantern"),
	env: env("APP_ENV", "development"),
	url: env("APP_URL", "http://localhost:3000"),
};
```

## Config Loader

`@core/Config.ts` handles loading and caching:

- Loads every `config/*.ts` module once during bootstrap (see `@core/Globals.ts`).
- Supports per-environment overrides (`config/app.production.ts`, etc.) merged on top of the base file.
- Provides a dot-notation `config("app.name")` helper registered on `globalThis.config`.
- Offers `config.cacheToFile()` / `config.loadFromCache(path?)` to warm config for production deployments.

### Example Override

```
config/
  app.ts
  app.production.ts
```

`app.production.ts` can override any nested value (timeouts, logging levels, etc.) when `NODE_ENV=production`.

## Global Helpers

`@core/Globals.ts` registers a handful of helpers on `globalThis` before the HTTP kernel runs:

| Helper | Description |
| --- | --- |
| `config(path, fallback?)` | Resolve configuration values. |
| `env(key, fallback?)` | Shortcut to `Env.get`. |
| `route(name, params?, absolute?)` | Proxy to the URL generator. |
| `inertia(component, props?, options?)` | Render an Inertia response using the current request. |
| `view(name, data?, options?)` | Render HTML using the `ViewEngine`. |

Because these helpers live on the global object, controllers, middleware, service providers, and tests can call them without manual imports, mirroring Laravel’s developer experience.

## Caching Configuration

For production builds you can serialize the loaded configuration:

```ts
// bootstrap/cache-config.ts
import { Config } from "@core/Config";

new Config().load(process.cwd()).cacheToFile();
```

Later, call `config.loadFromCache()` to avoid touching the filesystem for every `config()` call—similar to `php artisan config:cache`.

Lantern’s configuration layer aims to be unmistakably Laravel: environment-driven values, dot-notation lookups, optional caching, and expressive helpers available across your application.***
