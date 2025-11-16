# Codex Field Notes

Internal tracker for Codex while working inside Lantern. Keeps current understanding, gaps, and the short-term roadmap in one place.

## Project Pulse
- **Mission**: Laravel-inspired Bun/TypeScript framework with Inertia-first frontend and `@core` mirroring Illuminate namespaces.
- **Entry Point**: `server.ts` is expected to instantiate the application (via `bootstrap/app.ts`) and delegate to an HTTP kernel that wires routing, middleware, and exception handling.
- **Frontend**: Vue 3 + Inertia lives under `assets/js`, already ships `Index` and `About` pages expecting inertia responses plus partial reloads.
- **Testing & Tooling**: Bun test runner with skeleton feature/unit suites (`tests/**`), Biome + Prettier split linting, TypeScript config geared for strict bundler mode.

## Current Implementation Snapshot (Jan 2025)
- `server.ts` only stubs `Bun.serve` handlers—real request dispatching and error handling are not wired yet.
- `bootstrap/app.ts` sketches an `Application` API but references undefined symbols (`MiddleWare`, `middlewareManager`, etc.).
- `@core/` contains only a README; none of the Illuminate-equivalent systems (Routing, Http, Support, Facades, Inertia helpers) exist yet, so controllers/routes rely on future APIs.
- Demo routes/controllers (`routes/index.ts`, `app/Controllers/*`) assume helpers like `Route`, `inertia`, `route`, and `view` that need to be implemented inside `@core`.
- Tooling references `lantern.ts` in `package.json#scripts.serve`; that file is missing, so the hot-server script currently fails.
- Tests are placeholders (`expect(true).toBe(true)`), providing room to drive development TDD-style once real behavior lands.
- Several application-level files intentionally mock the desired APIs (e.g., controllers calling `inertia()`, routing facades). Treat those as canonical contracts—don’t rewrite them; instead, build `@core` so the mocks “just work.”

## Immediate Next Steps
1. **Bootstrap the HTTP layer**: Flesh out `server.ts` + `bootstrap/app.ts` to build the application, load providers, and proxy requests into an Http kernel.
2. **Stand up core routing/inertia plumbing**: Implement enough of `@core/Foundation`, `@core/Routing`, `@core/Http`, and `@core/Inertia` to satisfy the sample controllers and routes.
3. **Introduce real tests**: Replace placeholder specs with targeted feature/unit coverage (e.g., routing dispatch, controller validation, inertia responses) following the fail-first workflow.
4. **Docs parity**: As features solidify, mirror Laravel-style documentation under `@core/docs`, ensuring helpers/facades are discoverable.
5. **Tooling cleanup**: Align `package.json` scripts (e.g., provide `lantern.ts` or retarget `serve`) so dev ergonomics match the README instructions.

## Working Agreements & Constraints
- Every change requires `bunx tsc`, `bun run lint`, and focused `bun run test` executions with zero warnings/errors.
- New functionality must ship with Laravel-quality docs (`@core/docs/**`) and meaningful automated tests.
- Use ES modules + class syntax, keep types strict, and prefer facades/helpers for public APIs (e.g., `Route`, `Cache`).
- Avoid new dependencies unless essential; lean on Bun-native features (SQLite/Postgres/Redis, etc.) wrapped in framework abstractions.
- Honor the mocked APIs already present in the app layer; they define the exact syntax the real framework must support.
- Keep this `codex` knowledge base current; it is a mandated artifact per `AGENTS.md`.
- Always consult the provided external references (Laravel API docs, Inertia repos, etc.) when designing features to stay syntax-compatible.
- Follow the “write failing test → commit → implement → commit” cadence; prefer targeted tests over full-suite runs for iteration speed.

## Change Control Checklist
1. Draft an RFC in `docs/rfcs/README.md` for any non-trivial design or public API change.
2. Refresh acceptance criteria (`docs/SKELETON_APP.md`) and/or the global test plan (`docs/TEST_PLAN.md`) when scope shifts.
3. Add or adjust specs under `skeleton/tests/*` before changing behavior.
4. Update `packages/core/index.d.ts` if framework APIs surface new types.
5. Implement the minimal code inside `packages/*`, mirroring Laravel semantics.
6. Sync documentation, including `AGENTS.md`, so instructions stay authoritative.

## Core Surface Goals
- `AGENTS.md` enumerates an Illuminate-style tree under `@core` (Auth, Broadcasting, Bus, Cache, Collections, Config, Console, Container, Contracts, Cookie, Database, Encryption, Events, Filesystem, Foundation, Hashing, Http, JsonSchema, Log, Macroable, Mail, Notifications, Pagination, Pipeline, Queue, Redis, Routing, Session, Support, Testing, Validation, View/Inertia). Each namespace should eventually include the listed subdirectories and key classes (e.g., Inertia `Response`, `ResponseFactory`, various Props helpers).
- Views are expected to be Inertia-driven; reference the linked Inertia repositories for middleware and SSR expectations.
## Useful References
- Requirements: `AGENTS.md`
- Entry wiring: `server.ts`, `bootstrap/app.ts`
- Example HTTP surface: `routes/index.ts`, `app/Controllers/*`
- Frontend expectations: `assets/js/app.ts`, `assets/js/Pages/*`
- Tooling: `package.json`, `tsconfig.json`
