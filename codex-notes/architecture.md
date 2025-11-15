# Architecture Overview

## Runtime flow

1. `lantern.ts` boots Bun's HTTP server and wires `HandleResponse` / `HandleError` from `@core/Application/ProcessRequest.ts`.
2. `HandleResponse` wraps each request inside `RequestContext.run` using the custom `HttpRequest` wrapper so async work can read `RequestContext.get()` later, then instantiates `HttpKernel`.
3. `HttpKernel` (see `@core/Http/Kernel.ts`) performs maintenance & static file short-circuits, then builds the middleware stack (global + per-route) and finally hands control to the router via `app.handleRequest`.
4. `Application` (`@core/Application/Application.ts`) owns the IoC container, loads service providers, and exposes `handleRequest` which simply delegates to the router currently bound in the container.

This Laravel-style separation keeps bootstrap code small (`bootstrap/app.ts`) and lets providers & middleware own most behavior.

## Container, providers, and lifecycle

- `Application` creates a `Container` (`@core/Container.ts`) immediately but defers provider work until `configure(basePath)` runs. `configure` is async so providers can perform asynchronous setup (loading routes, warming caches, connecting to databases) before the server begins handling traffic. During configure, the app binds itself into the container under `"app"`, `"application"`, and the `Application` class, registers all framework/user providers from `@core/Foundation/ServiceProvidersManifest.ts`, and then boots them.
- Providers extend `ServiceProvider` and can `register` bindings (usually `singleton`) and `boot` to perform setup such as loading `routes/index.ts`. Because the container is available during construction, providers can resolve other services and even the `Application` instance directly.
- The container understands tokens (strings, symbols, or classes). Use `createToken<T>("description")` from `@core/Container/Tokens` when you need an interface-style binding. The container resolves dependencies declared via constructor parameter types (when the class is decorated with `@Injectable()`) or the `@Inject(Token)` decorator (with `static inject = []` still available as an escape hatch). It detects circular dependencies, keeps singleton instances cached, and now supports scoped lifetimes (e.g., `container.scoped(Token, factory)` combined with `container.runScope` to create per-request services).
- Global helpers (`globalThis.env` / `globalThis.config`) are initialized in `@core/Globals.ts`, which `HttpKernel` imports before serving traffic. Config files live in `/config` and are loaded via `Config.load`, supporting environment overrides and JSON caching.

## Routing and controllers

- `RoutingServiceProvider` binds the `router` singleton and dynamically imports `/routes`. Routes are registered using the facade `@core/Routing/Facades/Route`, which proxies to the container-resolved router.
- `Router` now mirrors Laravel's API surface: HTTP verb helpers, `match`, `any`, resource routes, route groups with `prefix/middleware/name/controller/where`, aliasable middleware, and `{param}` style placeholders (with optional segments like `{id?}`).
- Actions can be plain functions, controller classes with an `invoke` method, or controller method strings (made possible via `Route.controller(...)` groups). Route names automatically honor group prefixes, matching Laravel expectations. As routes are named they’re tracked inside the router, which also supports exporting/importing a JSON manifest for eventual `route:cache`-style tooling.
- Controllers still live inside `app/controllers` (see `IndexController.ts` for the default pattern). Controllers and middleware are instantiated through the container, so anything declaring `static inject = []` receives its dependencies automatically. Any route middleware defined through `.middleware([...])` is appended to the global middleware sequence in `HttpKernel`.
- URL generation is handled by `UrlGenerator` (`@core/Routing/UrlGenerator.ts`), bound inside the routing service provider and exposed globally via `route(name, params?, absolute?)`. The generator replaces `{param}` placeholders, trims optional segments, and appends leftover values as query strings using `APP_URL` for the base.

## Middleware, request, and validation

- `HttpKernel` asks the `MiddlewareManager` (`@core/Http/Middleware/Manager.ts`) to expand the configured stacks from `@core/Http/Middleware/Manifest.ts`. Declare global middleware, named groups (e.g., `web`, `api`), and aliases once, and each request receives the expanded, container-resolved instances.
- Middleware are composed right-to-left to build an async pipeline. Route-specific middleware entries can be class constructors, string aliases, or group names; after expansion they’re instantiated through the IoC container so dependencies declared via `static inject = []` are honored.
- `RequestContext` uses `AsyncLocalStorage` so downstream code can access the current request without explicitly passing it.
- `HttpRequest` (`@core/Http/Request.ts`) wraps the Fetch `Request` object with helpers (`input`, `query`, `params`, `route`, `validate`, etc.), lazily parsing JSON/form bodies and caching results per request.
- Validation is handled by `@core/Validation/Validator.ts` with familiar rules (`required`, `nullable`, `string`, `integer`, `boolean`, `array`, `email`, `min`, `max`, `in`, `regex`, plus custom callbacks). Failures throw a `ValidationException` which `HandleError` serializes into a JSON `422` response automatically.

## Rendering & Responses

- Inertia responses are handled by `InertiaResponseFactory` (`@core/Inertia/InertiaResponseFactory.ts`). Controllers call the global `inertia(component, props)` helper, which inspects the current `HttpRequest` via `RequestContext`, honors the Inertia spec (partial reloads, version checking, `X-Inertia` headers), and returns either JSON (for internal Inertia visits) or an HTML shell using `assets/index.html`.
- Blade-style responses use the global `view("template", data)` helper powered by `ViewEngine` (`@core/View/ViewEngine.ts`). Templates live under `resources/views` and support simple `{{ name }}` interpolation plus automatic `@vite` replacement.
- The HTML shell loader (`@core/View/AppShellRenderer.ts`) replaces `@vite` with the correct script/link tags by delegating to `ViteAssetTagGenerator`. In dev, tags point to the Vite dev server specified in `public/hot`; in production they reference `public/build/manifest.json` along with CSS and modulepreload tags. The same generator exposes `getVersion()` for Inertia’s asset versioning.

## Static assets and storage

- Static files live in `/public`; `HttpKernel.checkForStaticRequest` serves them directly before the middleware stack runs.
- Put a `.maintenance` file under `storage/app/.maintenance` to return a 503 response globally.
- User-controlled storage directories live under `storage/app/{public,private}` mirroring Laravel's disk layout, though adapters have not been implemented yet.
