# Application & Providers

Lantern's `Application` (`@core/Application/Application.ts`) is a lightweight kernel that wires the IoC container, service providers, and router. Understanding how it boots makes it easier to add bindings or perform work before handling traffic.

## Boot sequence
1. `bootstrap/app.ts` instantiates `new Application()`, awaits `app.configure(process.cwd())`, then exports the singleton `app`.
2. `configure` stores the base path, registers the application instance under the `Container` itself and `ContainerTokens.App`, and loads service providers.
3. Providers are registered first (so bindings exist), then booted (so they can execute side effects like loading routes) before the router is resolved.
4. `lantern.ts` imports `HandleResponse`/`HandleError` from `@core/Application/ProcessRequest`. `HandleResponse` builds an `HttpRequest`, enters `RequestContext`, then calls `app.getContainer().runScope()` so each request receives isolated scoped services.

## Service providers
- Providers live under `@core/Foundation/ServiceProvider.ts` and extend the abstract base class.
- Framework providers are declared in `@core/Foundation/ServiceProvidersManifest.ts`. It always includes `RoutingServiceProvider` plus anything you export from `bootstrap/providers.ts` (e.g., `import MyProvider from "@app/providers"`).
- Within `register()` call `this.app.singleton(...)`, `bind(...)`, or `instance(...)` to expose services. `boot()` is ideal for running async initialization (warming caches, loading routes, etc.).
- Providers receive both the application and its underlying container, so they can resolve other bindings immediately.

```ts
// app/providers/DatabaseProvider.ts
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { createToken } from "@core/Container/Tokens";
import { Database } from "../services/Database";

export const DatabaseToken = createToken<Database>("database");

export default class DatabaseProvider extends ServiceProvider {
	async register() {
		this.app.singleton(DatabaseToken, () => new Database(env("DATABASE_URL")));
	}

	async boot() {
		await this.app.resolve(DatabaseToken).connect();
	}
}

// bootstrap/providers.ts
import DatabaseProvider from "@app/providers/DatabaseProvider";
export default [DatabaseProvider];
```

## Resolving services
- Call `app.resolve(token)` anywhere you can import the bootstrap file. Tokens can be classes, strings, symbols, or custom tokens created via `createToken()`.
- `@core/Application/ContainerTokens.ts` publishes framework tokens: `ContainerTokens.App`, `ContainerTokens.Router`, `ContainerTokens.UrlGenerator`.
- The `Route` and `route()` facades resolve these tokens internally so you rarely need to interact with the container directly in controllers.

## When to add a provider
Add a provider whenever you need to:
- Register bindings used by controllers/middleware (database clients, caches, etc.).
- Configure third-party SDKs exactly once instead of per request.
- Load domain-specific routes (e.g., `AdminRoutingServiceProvider`).
- Run migrations or warm caches before serving traffic (inside `boot`).

Remember to export your provider from `bootstrap/providers.ts`; otherwise Lantern won't auto-register it during `app.configure()`.
