# Lantern Overview

Lantern is a Bun-first, Laravel-inspired full-stack framework. It pairs Bun's HTTP server with an IoC container, an Inertia + Vue frontend, and a Vite-powered asset pipeline so you can build modern web apps without leaving TypeScript.

## How requests flow
1. `bun run start` runs both Bun (`lantern.ts`) and Vite. Bun boots `HandleResponse` / `HandleError` from `@core/Application/ProcessRequest`.
2. `HandleResponse` wraps each inbound Fetch `Request` in a custom `HttpRequest`, stores it in `RequestContext` (AsyncLocalStorage), then executes `HttpKernel` inside a per-request container scope (`app.getContainer().runScope`).
3. `HttpKernel` ( `@core/Http/Kernel.ts`) checks for `storage/app/.maintenance`, streams static files from `public`, assembles middleware (global + per-route), and finally delegates to `app.handleRequest`.
4. `Application` owns the IoC container, loads service providers (framework + your `bootstrap/providers.ts`), and exposes `handleRequest`, which dispatches the request through the router.
5. `Router` locates the matching route, instantiates controllers via the container, resolves middleware aliases/groups, and invokes your controller/method/function.
6. Controllers typically return an Inertia or view response, which renders through `InertiaResponseFactory` or the `ViewEngine`, injecting Vite assets and HTML shells as needed.

## Key directories
- `@core/*` — framework runtime (container, routing, HTTP kernel, views, Vite integration, etc.).
- `app/controllers` — HTTP controllers (`invoke` methods or class methods). Decorate classes with `@Injectable()` if they need constructor injection.
- `app/providers` — custom service providers that register/boot bindings (export them from `bootstrap/providers.ts`).
- `routes/index.ts` — define routes using the `Route` facade (`Route.get(...)`, groups, middleware, resources, etc.).
- `config/*.ts` — configuration modules loaded globally via the `config()` helper. Use `config/app.development.ts` to override per environment.
- `assets/js` & `assets/css` — SPA entry points (Vue 3 + Inertia + Tailwind). Vite compiles these into `public/build`.
- `resources/views` — Blade-like HTML templates rendered by the `view()` helper.
- `storage/app` — writable directories for maintenance flags, caches, future disks.

## Frontend overview
- `assets/js/app.ts` bootstraps `createInertiaApp` and lazy-loads Vue pages from `assets/js/Pages` (update the glob when adding folders).
- Tailwind CSS v4 is configured via `assets/css/app.css` and `@tailwindcss/vite` in `vite.config.ts`.
- `assets/index.html` is the HTML shell consumed by both SSR-less renders and Inertia. It contains `@vite`/`@inertia` placeholders replaced on the server.

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

## Running the stack
```bash
bun install
bun run start   # concurrently launches Bun + Vite for local dev
bun run build   # builds production assets to public/build
bun run serve   # serves requests (expects assets built already)
```

```ts
// app/controllers/IndexController.ts
import type { HttpRequest } from "@core/Http/Request";

export class IndexController {
	async invoke(request: HttpRequest) {
		const query = request.query();
		return inertia("Home", {
			message: "Welcome to Lantern!",
			q: query.q ?? null,
		});
	}
}

// routes/index.ts
import { Route } from "@core/Routing/Facades/Route";
import { IndexController } from "@app/controllers/IndexController";

Route.get("/", IndexController).name("home");
```

Use the docs in this folder to dive deeper into every subsystem before extending the framework.
