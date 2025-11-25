# Project details

Lantern is a Laravel-inspired web framework, built with Bun (https://bun.com). Using Lantern should feel exactly like using Laravel, with Laravel inspired API's to interact with core classes and utilities. It should use the latest practices when designing features, using Typescript for full typesafety and IDE autocomplete which should feel magical and intuitive.

## Adding features

- Always write tests for framework features in @core/Testing
- Always check every file for typescript errors `bunx tsc --noEmit`
- Awalys run `bun run lint_check` to find linting errors and fix them

## Bun Wrapper

First steps are to create Laravel-style wrappers around main Bun features

- Error Handling ✅
- Request
- Response
- Cookies
- Env
- Fetch (Http)
- SQLite
- MySQL
- Postgres
- Redis
- Hashing
- File io/S3
- Websockets
- Routing

## Knowledgebase
- **Purpose**: Laravel-style framework on Bun with full TypeScript types; inertia-driven Vue 3 frontend (see `assets/js/app.ts`) and Tailwind via Vite.
- **Entrypoints & routing**: `server.ts` boots `Bun.serve` using routes from `routes/web.ts` (map of path -> handler). Unmatched routes return 404/500 responses.
- **Framework location**: Treat `@core` as the framework package. Vite plugin lives in `@core/Vite/Plugin/index.ts` (handles hot file, aliases, env checks, SSR externals). Framework tests live under `@core/Testing/tests` with preload `@core/Testing/tests/test-case.ts`.
- **Testing**: Bun test configured twice: root `bunfig.toml` points to `tests` with preload `tests/test-case.ts`; framework bunfig at `@core/bunfig.toml` points to `@core/Testing/tests`. Add new framework tests in `@core/Testing`; app tests in `tests`.
- **TypeScript setup**: `tsconfig.json` uses bundler resolution, `strict` on, path aliases (`@/*` -> `assets/js/*`, `@app/*`, `@core/*`, `@core/Http/*`, `@root/*`). `noEmit` enabled; keep files type-clean.
- **Scripts & tooling**: `bun run start` runs server + Vite via concurrently; `bun run serve` for server only; `bun run dev` for Vite. Lint with `bun run lint_check` (biome). Additional scripts: `bun run lint_server` (biome --write), `bun run lint_client` (prettier). Tests via `bun test`.
- **Frontend**: Vue pages under `assets/js/Pages`; Inertia pages auto-resolved via glob with required defaults; Tailwind styles in `assets/css/app.css`; Vite config uses Lantern plugin + Tailwind + Vue.
