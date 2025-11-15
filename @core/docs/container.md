# Container & Dependency Injection

Lantern's IoC container (`@core/Container.ts`) resolves everything from controllers to middleware and scoped services. Knowing how to bind tokens and request dependencies keeps your code clean.

## Binding options
- `container.bind(token, factory)` — resolves a new instance each time by running the factory or instantiating the given class.
- `container.singleton(token, factory)` — instantiates once and caches the result for the lifetime of the application.
- `container.instance(token, value)` — stores an already-instantiated value (useful for configuration objects).
- `container.scoped(token, factory)` — instantiates once per active scope. Lantern automatically wraps every HTTP request in `container.runScope(...)`, so scoped bindings are perfect for per-request caches or user-specific services.

```ts
import { createToken } from "@core/Container/Tokens";
import { ServiceProvider } from "@core/Foundation/ServiceProvider";
import { CacheStore } from "../services/CacheStore";

export const CacheToken = createToken<CacheStore>("cache");
export const RequestCacheToken = createToken<Map<string, any>>("request.cache");

export class CacheProvider extends ServiceProvider {
	register() {
		this.app.singleton(CacheToken, () => new CacheStore(env("REDIS_URL")));
		this.app
			.getContainer()
			.scoped(RequestCacheToken, () => new Map<string, any>());
	}
}
```

## Resolving
- `container.resolve(token)` returns the current instance, creating it as needed. Controllers/middleware resolved by the router/Kernal go through the container automatically.
- `container.has(token)` can be used to check whether something was bound.

## Dependency injection helpers
- Decorate classes with `@Injectable()` (from `@core/Container/Decorators`) to opt into constructor injection.
- Use TypeScript’s emitted metadata (`emitDecoratorMetadata: true` in `tsconfig.json`) so the container knows each parameter’s type.
- When injecting interfaces or primitives, decorate the constructor param with `@Inject(Token)` and register that token via `createToken<T>("description")`.
- As a fallback, classes can declare `static inject = [DependencyA, tokenB]` to specify tokens explicitly.

```ts
import { Injectable, Inject } from "@core/Container/Decorators";
import { CacheToken, RequestCacheToken } from "@app/providers/CacheProvider";

@Injectable()
export class UserService {
	constructor(
		@Inject(CacheToken) private cache: CacheStore,
		@Inject(RequestCacheToken) private requestCache: Map<string, any>,
	) {}

	async find(id: number) {
		if (this.requestCache.has(id)) {
			return this.requestCache.get(id);
		}

		const user = await this.cache.remember(`users:${id}`, 60, () =>
			this.fetchFromDatabase(id),
		);
		this.requestCache.set(id, user);
		return user;
	}
}
```

## Token utilities
- `@core/Container/Tokens.ts` exposes `createToken<T>()`, which returns a symbol safe to use as a binding key.
- Framework tokens live in `@core/Application/ContainerTokens.ts` (e.g., `ContainerTokens.Router`). Reuse them when you need to resolve the Router/UrlGenerator.

## Circular dependency & error handling
- The container tracks the current resolution stack. If class A depends on B and B depends on A, it throws a descriptive error instead of hanging.
- When metadata is missing (e.g., a parameter type resolves to `Object`), the container prompts you to use `@Inject(...)` or `static inject`.

## Request scopes & AsyncLocalStorage
Every HTTP request enters `container.runScope()` inside `HandleResponse`. Within that scope you can call `container.scoped(Token, factory)` and trust that:
- Resolutions happen once per request.
- Nested async operations (awaits, database calls) reuse the same scoped instance automatically.

This makes caching request-level data (current user, localization preferences) trivial without leaking state between users.
