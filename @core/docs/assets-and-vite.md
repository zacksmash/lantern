# Assets, Vite & Frontend Build

Lantern relies on Vite 7 to compile Vue + Inertia assets while Bun serves the backend.

## Entry points & structure
- `assets/js/app.ts` boots `createInertiaApp`, auto-importing Vue pages from `assets/js/Pages/**/*.vue`.
- `assets/css/app.css` imports Tailwind CSS v4. Update this file to add global styles.
- `assets/index.html` is the shared HTML shell for SSR-less Inertia responses and fallback pages. Keep the `@vite` and `@inertia` tokens intact.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "@tailwindcss/vite";
import lantern from "@core/Vite/Plugin";

export default defineConfig({
	plugins: [lantern({ input: ["assets/js/app.ts"] }), vue(), tailwind()],
});
```

```css
/* assets/css/app.css */
@import "tailwindcss";

body {
	font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
	background: #f8fafc;
}
```

```html
<!-- assets/index.html -->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Lantern</title>
		@vite
	</head>
	<body>
		@inertia
	</body>
</html>
```

## Running Vite
- `bun run dev` runs `vite dev`, reading configuration from `vite.config.ts`.
- `bun run build` compiles assets into `public/build` and writes `manifest.json`.
- `bun run start` runs Bun (`lantern.ts`) and Vite dev server concurrently (via `concurrently`).

## Lantern Vite plugin
`@core/Vite/Plugin/index.ts` exports the `lantern` plugin used in `vite.config.ts`.
- Configuration options: `input` (entry files), `publicDirectory` (default `public`), `buildDirectory` (default `build`), `hotFile` (default `${public}/hot`), and `transformOnServe`.
- During `vite serve`, the plugin writes the dev server URL to `public/hot` so the backend knows where to proxy assets. It also enforces safe environments (blocks HMR on Forge/Vapor/CI unless `LARAVEL_BYPASS_ENV_CHECK=1`).
- Default aliases include `@ -> /assets/js`. Add more via Vite's standard `resolve.alias` config.
- `server.origin` defaults to a placeholder so the plugin can replace it with the live dev-server URL in served code.
- When the dev server starts, the plugin emits helpful logs and deletes `public/hot` on exit signals to avoid stale state.

## Asset tag generation
`@core/Vite/AssetTagGenerator.ts` powers both views and Inertia responses.
- Dev mode: reads `public/hot` to discover the dev server URL, then injects `<script type="module" src=".../@vite/client">` and your entry script.
- Production: loads `public/build/manifest.json`, emits `<link rel="modulepreload">`, CSS `<link>` tags, and the module `<script>` referencing `/build/<hashed>.js`.
- `getVersion()` hashes the manifest JSON (or returns `"dev"` when in hot mode) so Inertia can detect asset changes.
- Results are cached per process to avoid re-reading the manifest on every request.

## Static files & public directory
- Anything placed in `public/` (including the `build/` output) can be served directly. `HttpKernel.checkForStaticRequest()` handles range-safe lookups and prevents directory traversal attacks.
- The presence of `public/hot` toggles dev behavior throughout the stack.

## Frontend ergonomics
- Tailwind is enabled via `@tailwindcss/vite`, so you can use the new utility syntax without extra config.
- Vue SFC support comes from `@vitejs/plugin-vue`.
- To add new entry points (e.g., `admin.ts`), update `lantern({ input: ['assets/js/app.ts', 'assets/js/admin.ts'] })` in `vite.config.ts` and your HTML/template references.

```ts
// assets/js/admin.ts
import "./css/app.css";
console.log("Admin entry loaded");
```
