# Assets, Vite & Frontend Build

Lantern ships with a first-class Vite integration that feels just like Laravel’s. Vite handles Inertia + Vue, Tailwind v4, and asset versioning while Bun focuses on HTTP.

## Project Layout

| Path | Purpose |
| --- | --- |
| `assets/js/app.ts` | Inertia entry point that bootstraps Vue pages. |
| `assets/css/app.css` | Tailwind v4 + global styles. |
| `assets/index.html` | HTML shell containing `@vite` and `@inertia` markers. |
| `public/` | Static assets. Vite writes builds to `public/build`. |

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

## Development Server

Run Vite with `bun run dev` or `bun run start` (which boots both Bun and Vite). The Lantern Vite plugin:

- Writes the dev server URL to `public/hot` so the backend can proxy assets.
- Configures `server.origin` automatically so SSR replacements work.
- Cleans up the `hot` file on exit to avoid stale URLs.

While `public/hot` exists, `@core/Vite/AssetTagGenerator` emits `<script type="module" src="https://localhost:@port/@vite/client">` and injects your entry points just like Laravel’s `@vite` directive.

## Production Build

```bash
bun run build   # generates public/build and manifest.json
```

During a production build the Lantern plugin:

- Compiles every entry declared in `lantern({ input: [...] })`.
- Writes hashed files to `public/build`.
- Produces `public/build/manifest.json` used by the server to generate preload `<link>` tags, CSS `<link>` tags, and module `<script>` tags.

Use `bun run serve` (or any Bun host) after building assets.

## Using Assets In Views & Inertia

`ViteAssetTagGenerator` drives both the view helper and Inertia response factory:

```ts
const tags = await assetGenerator.generateTags(); // called internally
```

- **Views** – `ViewEngine` replaces every `@vite` token inside `resources/views/*.html` with the generated tags.
- **Inertia** – The HTML shell returned by `InertiaResponseFactory` also includes the same tags so SPA hydration works without extra work.
- **Versioning** – `getVersion()` hashes the manifest (or returns `"dev"` during hot reload). Inertia compares this value with `X-Inertia-Version` to trigger 409 reloads when assets change.

## Custom Entries & Aliases

Need multiple entry points? Pass them to the plugin:

```ts
lantern({
	input: ["assets/js/app.ts", "assets/js/admin.ts"],
	publicDirectory: "public",
	buildDirectory: "build",
});
```

Vite’s standard configuration is still available—add `resolve.alias`, `css.postcss`, or other options as needed.

## Static Files

Anything placed directly in `public/` (images, fonts, uploads) can be hit without touching Vite. `HttpKernel` short-circuits requests to these files while guarding against directory traversal attacks.

## Tailwind & Vue

- Tailwind v4 is enabled through `@tailwindcss/vite`, so utilities work out of the box.
- SFC support comes from `@vitejs/plugin-vue`.
- Add additional CSS by editing `assets/css/app.css` or importing new files in your JS entry point.

Lantern aims to mirror Laravel’s “just works” asset story. Point Vite at your entry files, run `bun run start` during development, and the backend automatically injects the right tags regardless of environment.***
