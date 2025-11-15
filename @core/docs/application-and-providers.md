# Application & Service Providers

Lantern’s application class is intentionally familiar if you have used Laravel. It owns the IoC container, discovers service providers, and exposes helper tokens so the router, cache, queue and other services can be resolved anywhere.

## Application Lifecycle

1. **Bootstrap** – `bootstrap/app.ts` instantiates `new Application()`, calls `await app.configure(process.cwd())`, and exports the singleton `app`.
2. **Configuration** – `configure()` stores the base path, registers the `Application` instance itself plus `ContainerTokens.App`, then loads framework + user providers from `@core/Foundation/ServiceProvidersManifest.ts` and `bootstrap/providers.ts`.
3. **Provider registration** – Every provider’s `register()` method runs first so bindings exist before anything bootstraps.
4. **Provider booting** – After registration, `boot()` is invoked on each provider so side effects (route loading, cache warming, etc.) can occur.
5. **Request handling** – `HandleResponse` wraps each Fetch `Request` in an `HttpRequest`, pushes it into `RequestContext`, and executes the `HttpKernel` inside `app.getContainer().runScope(...)`, giving every request isolated scoped services.

## Writing Service Providers

All providers extend `ServiceProvider` from `@core/Foundation/ServiceProvider.ts`:

```ts
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { createToken } from "@core/Container/Tokens";
import { Mailer } from "@app/services/Mailer";

export const MailerToken = createToken<Mailer>("services.mailer");

export default class MailServiceProvider extends ServiceProvider {
	register() {
		this.app.singleton(MailerToken, () => new Mailer(env("MAIL_DSN")));
	}

	async boot() {
		await this.app.resolve(MailerToken).warmTemplates();
	}
}
```

- **register()** – Bind things to the container (`bind`, `singleton`, `instance`, `scoped`). Perform only lightweight operations.
- **boot()** – Run initialization that depends on registered services (loading routes, connecting to databases, scheduling background work).
- Export providers from `bootstrap/providers.ts` so Lantern adds them to the manifest.

## Container Tokens

Lantern publishes common tokens under `@core/Application/ContainerTokens.ts`:

| Token | Resolves |
| --- | --- |
| `ContainerTokens.App` | The `Application` singleton. |
| `ContainerTokens.Router` | Main `Router` instance. |
| `ContainerTokens.UrlGenerator` | URL generator (`route()` helper). |
| `ContainerTokens.CacheManager`, `SessionManager`, `AuthManager`, etc. | Subsystems provided by the framework. |

You can create custom symbols via `createToken<T>()`. Tokens may be classes, strings, or symbols—the same ergonomics as Laravel’s container.

## Request Scoping

`Application.handleRequest()` delegates to the router inside a scoped container. `app.getContainer().runScope()` pushes a map onto an internal stack so services registered via `container.scoped(...)` receive one instance per request. When the request completes (synchronously or asynchronously), the scope is popped and all scoped services are eligible for GC.

## Resolving Services

- Use `app.resolve(Token)` anywhere the bootstrap file can be imported.
- Facades such as `Route`, `URL`, `cache`, `db`, etc., are thin helpers that resolve the corresponding container tokens for you.
- Controllers and middleware can opt into constructor injection via the `@Injectable()` decorator or `static inject = [...]`, mirroring Laravel’s automatic dependency injection.

## When To Create A Provider

Create a provider when you need to:

- Register domain services (payment gateways, mailers, analytics clients).
- Configure third-party SDKs once per process.
- Load route files conditionally (e.g., `AdminRoutingServiceProvider`).
- Perform boot-time work such as seeding caches or starting schedulers.

Providers keep your application bootstrap predictable: registrations happen before requests, boot logic happens exactly once, and all services flow through the same container contracts you already know from Laravel.***
