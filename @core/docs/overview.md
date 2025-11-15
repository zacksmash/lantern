# Lantern Overview

Lantern is a Bun-native, Laravel-flavoured framework that keeps the DX of Laravel while staying entirely in TypeScript. This document mirrors the cadence of the Laravel docs so you can quickly map familiar ideas to their Lantern counterparts.

## Architecture At A Glance

1. **Bootstrap** – `lantern.ts` boots the application and registers framework + project service providers from `bootstrap/providers.ts`.
2. **HTTP entry** – Every inbound Fetch `Request` flows through `HandleResponse` / `HandleError` (`@core/Application/ProcessRequest.ts`). A custom `HttpRequest` instance is stashed inside `RequestContext` (an AsyncLocalStorage) and the container spins up a per-request scope.
3. **Kernel** – `HttpKernel` (`@core/Http/Kernel.ts`) checks for maintenance mode, opportunistically streams static files from `public`, then executes the middleware stack (global → route) before dispatching to `Application.handleRequest`.
4. **Routing** – The `Router` matches the request, resolves controllers via the IoC container, and invokes controller methods, `invoke` handlers, or closures. Middleware aliases, groups, and prefixes are handled just like Laravel.
5. **Responses** – Controllers usually return Inertia responses or rendered views. `InertiaResponseFactory` builds JSON or the HTML shell, while the `ViewEngine` renders plain HTML with optional Vite asset tags.

## Directory Structure

| Path | Description |
| --- | --- |
| `@core/*` | Framework source (container, kernel, routing, cache, session, auth, etc.). |
| `app/controllers` | HTTP controllers. Use `@Injectable()` when constructor injection is needed. |
| `app/middleware` | Custom middleware classes registered in `@core/Http/Middleware/Manifest.ts`. |
| `app/providers` | Application service providers exported from `bootstrap/providers.ts`. |
| `config/*.ts` | Configuration files loaded via `config()`/`globalThis.config`. Supports per-environment overrides (`config/app.development.ts`). |
| `routes/index.ts` | Main route file. Use the `Route` facade for fluent definitions. |
| `resources/views` | HTML templates rendered by the `view()` helper. |
| `assets/js` and `assets/css` | Inertia + Vue SPA entry points compiled by Vite. |
| `storage/app` | Runtime storage (maintenance mode flag, cache artifacts, uploads, etc.). |

## Request Lifecycle

```mermaid
graph TD
  A[Fetch Request] --> B[HandleResponse]
  B --> C[RequestContext + Container Scope]
  C --> D[HttpKernel]
  D -->|Static file?| E[Stream from /public]
  D -->|Otherwise| F[Middleware Pipeline]
  F --> G[Router]
  G --> H[Controller / Closure]
  H --> I[Response (Inertia/View/JSON)]
```

### RequestContext
Lantern’s `RequestContext` is the equivalent of Laravel’s request singleton. Any code path can call `RequestContext.get()` (or helpers like `inertia()`) to access the current request inside the active AsyncLocalStorage scope.

### Middleware Pipeline
Global middleware live in `@core/Http/Middleware/Manifest.ts`. Route middleware are registered there as aliases and composed via `Route.middleware`, `Route.group`, and the `Route` facade helpers.

## Frontend Stack

- **Inertia + Vue 3** – `assets/js/app.ts` bootstraps Inertia and auto-registers Vue page components from `assets/js/Pages`.
- **Tailwind CSS v4** – Configured through `assets/css/app.css` with the `@tailwindcss/vite` plugin.
- **Vite HTML shell** – `assets/index.html` provides the HTML skeleton. The server replaces `@vite` markers with generated asset tags, similar to Laravel’s Vite integration.

```ts
// assets/js/app.ts
import { createInertiaApp } from "@inertiajs/vue3";
import { createApp, h } from "vue";

createInertiaApp({
	resolve: (name) => {
		const pages = import.meta.glob("./Pages/**/*.vue", { eager: true });
		return pages[`./Pages/${name}.vue`];
	},
	setup({ el, App, props, plugin }) {
		createApp({ render: () => h(App, props) }).use(plugin).mount(el);
	},
});
```

## Local Development

```bash
bun install
bun run start   # boots Bun + Vite concurrently
bun run lint    # biome + prettier
bun run test    # bun test
```

Lantern mirrors Laravel’s developer ergonomics: conventions live under `config`, services are bound through providers, middleware is expressive, and Blade-like views or Inertia responses keep UI rendering consistent. Use the rest of this documentation set to dive into the individual systems.***
