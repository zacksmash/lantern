# Container & Dependency Injection

Lantern’s IoC container mirrors Laravel’s service container. Bind your services once, then let controllers, middleware, and jobs receive dependencies automatically.

## Binding Services

`@core/Container.ts` exposes the following methods:

| Method | Description |
| --- | --- |
| `bind(token, factory)` | Resolves a fresh instance each time. |
| `singleton(token, factory)` | Creates the instance once per process. |
| `instance(token, value)` | Registers an already-created object. |
| `scoped(token, factory)` | Resolves once per request scope. |

Bindings can use classes, symbols, or strings as tokens. Create descriptive tokens with `createToken<T>()`.

```ts
import { createToken } from "@core/Container/Tokens";

export const MailerToken = createToken<Mailer>("services.mailer");

this.app.singleton(MailerToken, () => new Mailer(env("MAIL_DSN")));
```

## Injecting Dependencies

- Add the `@Injectable()` decorator (or `static inject = [...]`) so the container inspects constructor parameters.
- TypeScript metadata (`emitDecoratorMetadata`) allows the container to infer class parameters automatically.
- For interfaces or primitives, decorate parameters with `@Inject(Token)`:

```ts
import { Injectable, Inject } from "@core/Container/Decorators";
import { MailerToken } from "@app/providers/MailServiceProvider";

@Injectable()
export class OrderService {
	constructor(@Inject(MailerToken) private mailer: Mailer) {}
}
```

If metadata resolves to `Object`, the container throws and instructs you to use `@Inject()` or `static inject`.

## Request Scopes

`app.getContainer().runScope()` wraps every HTTP request so scoped bindings stay isolated:

```ts
const RequestCache = createToken<Map<string, unknown>>("request.cache");

this.app.getContainer().scoped(RequestCache, () => new Map());
```

Any class resolved during the request now receives the same `Map` instance, but a new map is created for subsequent requests.

## Resolving Services

- Call `app.resolve(Token)` manually when you need a service outside of the container’s auto-resolution path.
- Controllers, middleware, and route closures are resolved through the container automatically.
- Use `container.has(token)` to check for existing bindings.

## Error Handling

The container guards against circular dependencies and missing metadata. Errors include the class name and parameter index to help you diagnose issues quickly.

## Built-in Tokens

`@core/Application/ContainerTokens.ts` defines framework tokens for the router, URL generator, cache manager, session manager, and more. Reuse them instead of creating duplicate bindings.

Lantern’s container is intentionally straightforward: it feels like Laravel’s, supports constructor injection with decorators, and plays well with the AsyncLocalStorage-powered request scopes introduced by `HandleResponse`.***
