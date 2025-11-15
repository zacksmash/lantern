# Storage & Static Files

Lantern mirrors Laravel’s filesystem conventions: `public/` for web-accessible assets and `storage/` for everything else.

## Public Directory

- Serve images, favicons, robots.txt, and compiled assets from `public/`.
- `HttpKernel` checks this directory before running middleware, so requests such as `/build/app.js` never touch your controllers.
- Vite writes hashed files to `public/build`; keep it in your deployment artifact or rebuild during deploys.

## Hot File

During `vite dev`, the Lantern Vite plugin writes the dev server URL to `public/hot`. Its presence tells `ViteAssetTagGenerator` (and Inertia) to use the dev server instead of the manifest. Delete the file or stop Vite to fall back to production behaviour.

## Storage Directory

```
storage/
  app/
    public/
    private/
    .maintenance
```

- Use `storage/app/public` for files you later symlink or copy into `public/`.
- `storage/app/.maintenance` toggles maintenance mode; create/remove the file to control availability.
- Config caches and other metadata can live under `storage/` (e.g., `storage/config.cache.json`).

Example helpers:

```ts
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const storeAvatar = async (file: File, userId: number) => {
	const dir = join(process.cwd(), "storage/app/public/avatars");
	await mkdir(dir, { recursive: true });
	await Bun.write(join(dir, `${userId}.png`), file.stream());
};
```

## Security Tips

- Never expose `storage/` directly via a static server; only `public/` should be readable by HTTP.
- Sanitize filenames before writing uploads to `public/`.
- Consider wrapping file operations inside a service/provider so you can swap in disk adapters later.

Lantern’s filesystem footprint is intentionally simple today, but the familiar layout makes it easy to grow into a Laravel-like storage abstraction down the road.***
