# Storage & Static Assets

Lantern keeps filesystem responsibilities simple but provides a few conveniences.

## Public directory
- Place publicly accessible files in `public/` (favicons, robots.txt, uploaded assets you intend to expose).
- `HttpKernel` serves any matching file before running middleware, so requests like `/build/app.js` never touch your controllers.
- The Vite build writes hashed assets to `public/build`. Keep this folder under version control if you deploy via build artifacts.

## Hot file
- During `vite dev`, the Lantern Vite plugin writes the dev server URL to `public/hot`.
- Its presence toggles dev-asset behavior inside `ViteAssetTagGenerator` and Inertia. Delete the file (or stop Vite) to fall back to manifest tags.

## Storage directory
- Use `storage/` for runtime data not meant to be public. The default layout mirrors Laravel (`storage/app/public`, `storage/app/private`, etc.).
- Create `storage/app/.maintenance` to toggle maintenance mode instantly.
- Configuration caches can live under `storage/config.cache.json` (see `configuration-and-globals.md`).
- Although disk adapters are not implemented yet (see `codex-notes/gaps.md`), this structure allows you to add them later without breaking conventions.

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const saveAvatar = async (file: File, userId: number) => {
	const dir = join(process.cwd(), "storage/app/public/avatars");
	await mkdir(dir, { recursive: true });
	await Bun.write(join(dir, `${userId}.png`), file.stream());
};

const enableMaintenance = async () => {
	await writeFile("storage/app/.maintenance", "down for upgrades");
};
```

## Security tips
- Never expose `storage/` via a static file server. Bun only serves `public` paths, but keep your deployment configuration aligned with that assumption.
- Sanitize filenames before copying uploads into `public/` if you implement file handling manually.
