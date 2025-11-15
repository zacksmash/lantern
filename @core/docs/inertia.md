# Inertia

Lantern treats Inertia as a first-class response type. The API mirrors Laravel’s helpers so Vue pages feel native on the server.

## Rendering Responses

Use the global `inertia()` helper (or `makeInertia`) inside controllers:

```ts
return inertia("Dashboard", {
	user: (request) => request.user(),
	stats: async () => this.statsService.summary(),
}, { status: 200 });
```

- The first argument is the Vue component name relative to `assets/js/Pages`.
- Props can be plain values or functions receiving the `HttpRequest`. Async resolvers are awaited.
- Options allow you to override status codes, headers, and version strings.

## Prop Helpers

`@core/Inertia/Inertia.ts` exports decorators similar to Laravel’s Inertia helpers:

| Helper | Purpose |
| --- | --- |
| `optional(resolver, { group? })` | Exclude by default; only resolved when explicitly requested via partial reloads. |
| `always(resolver)` | Always computed, even during partial visits. |
| `defer(resolver, { group?, only? })` | Skip initial load, advertise availability via `page.deferredProps`. |
| `merge(resolver, { strategy?, match?, path? })` | Control append/prepend/deep merge semantics. |
| `scroll(resolver, options)` | Attach infinite-scroll metadata (page names, previous/next references). |

These helpers generate metadata inside the Inertia page payload, matching the official spec.

## Partial Reloads & Versioning

- `InertiaResponseFactory` inspects `X-Inertia-Partial-Component` / `X-Inertia-Partial-Data` headers and only resolves the requested props when the component matches.
- `X-Inertia-Version` is compared against the Vite manifest hash (`ViteAssetTagGenerator.getVersion()`). On mismatch Lantern returns `409` with `X-Inertia-Location` so the client can perform a full visit.
- Override the version per response with the `options.version` argument.

## HTML vs JSON

| Request header | Behaviour |
| --- | --- |
| `X-Inertia: true` | Returns JSON with props, merge metadata, scroll info, and `Vary: Accept`. |
| Absent | Renders `assets/index.html` through `AppShellRenderer`, injects Vite tags, and embeds the JSON payload in the `<div id="app">`. |

## Pagination & Infinite Scroll

Use `scroll()` or `merge()` helpers to automatically emit pagination metadata. The server extracts `meta`, `links`, and query string values to populate `scrollProps`, mirroring Laravel’s Inertia implementation.

## Customizing The Factory

Need to swap the HTML shell or asset generator? Instantiate your own `InertiaResponseFactory` and call `makeInertia(factory, request, ...)`:

```ts
import { makeInertia, inertiaResponseFactory } from "@core/Inertia/Inertia";
import { CustomShell } from "@app/view/CustomShell";

const factory = new InertiaResponseFactory(
	inertiaResponseFactory["assets"],
	new CustomShell(),
);

export const handler = (request: HttpRequest) =>
	makeInertia(factory, request, "Docs/Preview", { content: loadDocs() });
```

Lantern’s Inertia integration is intentionally Laravel-like: expressive helpers, automatic versioning, and rich metadata so your Vue pages behave exactly as they would in a PHP application.***
