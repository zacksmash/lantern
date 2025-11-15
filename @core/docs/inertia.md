# Inertia Responses

Lantern treats Inertia as a first-class citizen. `globalThis.inertia` renders Vue pages, handles partial reloads, and injects HTML shells automatically.

## Basic usage
```ts
return inertia("Dashboard", {
  user: (request) => request.input("user"),
  stats: async () => await this.statsService.summary(),
});
```
- The first argument is the component name under `assets/js/Pages`.
- Props can be plain values or functions that accept the current `HttpRequest`. Async resolvers are awaited.
- Pass `options` to override the response (e.g., `{ status: 201, headers: { Location: "/users" } }`).

## Versioning & negotiation
- `InertiaResponseFactory` compares the client’s `X-Inertia-Version` header against `ViteAssetTagGenerator.getVersion()`. When versions differ, it returns a `409` with an `X-Inertia-Location` header so the client performs a full visit.
- Override the version per response using `inertia(component, props, { version: "custom" })`.

## Partial reloads & deferred props
- Inertia honours `X-Inertia-Partial-Component` + `X-Inertia-Partial-Data` headers. When the current component matches, Lantern only resolves the requested keys.
- Mark props as optional, always included, deferred, mergeable, or scroll-aware using helpers from `@core/Inertia/Inertia.ts`:
  - `optional(resolver, { group? })` — omit from full responses and include only when explicitly requested.
  - `always(resolver)` — include even during partial reloads.
  - `defer(resolver, { group?, only? })` — skip during the initial load and expose metadata so the client can request the group later.
  - `merge(resolver, { strategy?, match?, path? })` — opt into append/prepend/deep merge semantics. Honors the `X-Inertia-Infinite-Scroll-Merge-Intent` header (`append`/`prepend`).
  - `scroll(resolver, { match?, pageName?, currentPage?, nextPage?, previousPage?, reset? })` — automatically attach scroll metadata for paginated results.

Lantern stores deferred groups in `page.deferredProps` and merge paths in `page.mergeProps`/`prependProps`/`deepMergeProps`, mirroring the official Inertia spec.

```ts
import { optional, always, defer, merge, scroll } from "@core/Inertia/Inertia";

return inertia("Posts/Index", {
	user: always((request) => request.input("user")),
	notifications: optional(() => fetchNotifications()),
	latestPosts: defer(
		async () => await this.postRepository.latest({ limit: 5 }),
		{ group: "posts" },
	),
	feed: merge(
		(request) => this.feedService.forUser(request.params("id")),
		{ strategy: "append", match: "feed" },
	),
	comments: scroll(
		async () => this.commentRepository.paginate({ page: request.query("page") }),
		{ match: "comments", pageName: "page" },
	),
});
```

## HTML vs JSON
- If the request contains `X-Inertia: true`, Lantern returns JSON (`Content-Type: application/json`) with props, merge metadata, scroll info, and `Vary: Accept`.
- Otherwise it loads `assets/index.html` via `AppShellRenderer`, replaces `@vite` with the proper tags, renders `<div id="app" data-page="...">`, and sends HTML.

## Request awareness
All prop resolvers and helper wrappers receive the `HttpRequest`. The global `inertia()` helper reads it from `RequestContext`, so ensure you only call `inertia()` during an active request (inside controllers, middleware, or code invoked downstream).

## Factory access
If you need to plug in a different template or asset generator (for SSR experiments), import `makeInertia(inertiaResponseFactory, request, ...)` and provide your own factory instance or request.

```ts
import { makeInertia, inertiaResponseFactory } from "@core/Inertia/Inertia";
import { CustomTemplateRenderer } from "../view/CustomTemplateRenderer";

const factory = new InertiaResponseFactory(
	inertiaResponseFactory["assets"],
	new CustomTemplateRenderer(),
);

export const handler = async (request: HttpRequest) => {
	return makeInertia(factory, request, "Docs/Preview", { markdown: loadDoc() });
};
```
