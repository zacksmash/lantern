# Frontend Stack

## Overview

- SPA runtime uses Vue 3 + Inertia (`assets/js/app.ts`). The helper `createInertiaApp` lazy-loads `.vue` pages under `assets/js/Pages`.
- Styling is powered by Tailwind CSS v4. The entry CSS (`assets/css/app.css`) imports `tailwindcss` and defines the base font stack.
- HTML shell lives in `assets/index.html` and includes `@vite` / `@inertia` placeholders that are replaced at render time.

## Vite & bundling

- `vite.config.ts` loads three plugins: the custom Lantern plugin, Tailwind's official plugin, and `@vitejs/plugin-vue`.
- The Lantern plugin (`@core/Vite/Plugin/index.ts`) mirrors Laravel's vite-plugin behavior:
  - Handles dev server hot file management (`public/hot`),
  - Injects default aliases (`@ -> assets/js`),
  - Prevents running `vite serve` in disallowed environments unless `LARAVEL_BYPASS_ENV_CHECK=1`,
  - Ensures the Inertia helpers are kept inside the SSR bundle when needed.
- Production builds emit to `public/build` by default. Update `buildDirectory` or `publicDirectory` via the plugin config if this changes.

## Browser assets served by Bun

- `HttpKernel.checkForStaticRequest` returns files directly from `/public` before hitting middleware, so ensure built assets end up there.
- The dev server uses `public/hot` + `assets/index.html` as usual; `bun run dev` from `package.json` already launches both Bun and Vite concurrently.
