# HTTP Kernel & Bootstrap

Lantern mirrors Laravel’s startup flow: the Bun entry point builds an `Application` instance (our Illuminate container equivalent), wires routing/middleware/exception configuration, and defers all HTTP work to a kernel. Every incoming request funnels through the kernel and every thrown exception is captured by the same application-level handler.

## Bootstrapping the Application

```ts
import { Application } from "@core/Foundation/Application";
import type { Exceptions } from "@core/Foundation/Http/Exceptions";
import type { MiddleWare } from "@core/Foundation/Http/Middleware";
import { HandleInertiaRequests } from "@app/Middleware/HandleInertiaRequests";
import AppProviders from "@root/bootstrap/providers";

export const app = new Application(process.cwd())
  .withRouting({
    web: `${process.cwd()}/routes/web.ts`,
    api: `${process.cwd()}/routes/api.ts`,
    commands: `${process.cwd()}/routes/console.ts`,
    health: "/up",
  })
  .withMiddleware((middleware: MiddleWare) => {
    middleware.encryptCookies({ except: ["appearance", "sidebar_state"] });
    middleware.web({ append: [], prepend: [], remove: [], replace: [] });
  })
  .withExceptions((exceptions: Exceptions) => {
    exceptions.report((error) => console.error(error));
  })
  .withProviders(AppProviders)
  .create();
```

- `withRouting` accepts the same manifest-style configuration you’d expect from Laravel’s `Illuminate\Foundation\Application`.
- `withMiddleware` receives a fluent `MiddleWare` manager for configuring global stacks (`encryptCookies`, `web`, etc.).
- `withExceptions` exposes an `Exceptions` manager where you can register custom reporters / renderers for centralized error handling.
- `create()` finalizes the bootstrap process and instantiates the HTTP kernel (defaults to `DefaultHttpKernel`).

## Server Entry Point

`server.ts` now mirrors Laravel’s `public/index.php`: capture the request, hand it to the kernel, send the response, and run terminable middleware.

```ts
import { envNumber } from "@core/Support/env";
import { app } from "./bootstrap/app";

export const server = Bun.serve({
  port: envNumber("PORT", 3000),
  development: app.isDebug(),
  async fetch(request) {
    const httpRequest = app.captureRequest(request);      // Illuminate\Http\Request::capture()
    const response = await app.dispatch(httpRequest);     // $kernel->handle($request)
    await app.terminate(httpRequest, response);           // $kernel->terminate($request, $response)
    return response;
  },
  error(error) {
    return app.handleError(error);
  },
});
```

Every request and low-level error is proxied back through the `Application`, guaranteeing a single choke point for observability and error rendering.

## Kernel Lifecycle

The default kernel (`@core/Foundation/Http/DefaultHttpKernel`) is intentionally minimal right now—it reads your routing manifest, exposes a `/up` health check, and returns a JSON payload verifying the framework is alive. As the routing + middleware stacks come online, this kernel will dispatch through those systems without needing to change your `server.ts`. The `terminate()` hook is already wired for future terminable middleware.

If you need to override the kernel (e.g., for tests), call `app.useKernel(() => new CustomKernel()).create();`.

## Container & Service Providers

Lantern ships with an IoC container that mirrors Laravel’s binding API:

```ts
app.bind("clock", () => new Clock());
app.singleton(Logger, () => new Logger(app.config("app.name")));
app.instance("config", appConfigRepository);

const logger = app.make(Logger);
```

Service providers extend `@core/Foundation/ServiceProvider` and receive the application instance. The bootstrapper registers providers in this order:

1. Framework providers (defined under `@core/Foundation/Providers`)
2. Any providers supplied to `app.withProviders([...])`
3. User providers from `bootstrap/providers.ts` (when `withProviders` keeps the default `includeBootstrapProviders = true`)

Each provider’s `register → boot → booted` lifecycle mirrors Laravel’s behaviour, and global `app.booting()` / `app.booted()` callbacks wrap the entire boot sequence.

## Exception Handling

Exceptions are routed through a Laravel-style handler contract (`@core/Foundation/Exceptions/Handler`). The default handler simply defers to the application’s fallback responses (text in production, JSON with stack traces in debug). Override it via:

```ts
import { Handler } from "@app/Exceptions/Handler";

export const app = new Application(process.cwd())
  .withExceptionHandler(Handler)
  .create();
```

Handlers may register `reportable` / `renderable` callbacks, honour `dontReport`, and decide whether an error should be reported or rendered. You can continue to hook quick reporters via `.withExceptions()` just like Laravel’s `Illuminate\Foundation\Exceptions`.
