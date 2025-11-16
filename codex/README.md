# Codex Field Notes

Internal tracker for Codex while working inside Lantern. Keeps current understanding, gaps, and the short-term roadmap in one place.

## Project Pulse
- **Mission**: Laravel-inspired Bun/TypeScript framework with Inertia-first frontend and `@core` mirroring Illuminate namespaces.
- **Entry Point**: `server.ts` is expected to instantiate the application (via `bootstrap/app.ts`) and delegate to an HTTP kernel that wires routing, middleware, and exception handling.
- **Frontend**: Vue 3 + Inertia lives under `assets/js`, already ships `Index` and `About` pages expecting inertia responses plus partial reloads.
- **Testing & Tooling**: Bun test runner with skeleton feature/unit suites (`tests/**`), Biome + Prettier split linting, TypeScript config geared for strict bundler mode.

## Current Implementation Snapshot (Jan 2025)
- `server.ts` now mirrors Laravel’s `index.php` (`capture → handle → terminate`) by piping Bun requests through `app.captureRequest()`, `app.dispatch()`, and `app.terminate()`, while logging the running environment + port.
- `bootstrap/app.ts` configures routing, middleware, exception hooks, and service providers (framework + app-level) using the new `Application` API and exports a shared `app` instance.
- `@core/Foundation` now exposes a real IoC container, configuration repository, provider lifecycle (register → boot → booted + booting/booted callbacks), and Laravel-style exception handler contract in addition to the default HTTP kernel. The kernel now runs requests through a configurable middleware pipeline (global + group + alias stacks) before producing a response, and responses still default to a JSON “Lantern is running” payload (health check on `/up`).
- Controllers/routes still assume future helpers (`Route`, `inertia`, `route`, `view`) that need to be implemented before the demo app does anything dynamic.
- Tooling references `lantern.ts` in `package.json#scripts.serve`; that file is missing, so the hot-server script still needs attention.
- Tests now include coverage for the `Application`/kernel lifecycle, while other suites remain placeholders for future expansion.
- Several application-level files intentionally mock the desired APIs (e.g., controllers calling `inertia()`, routing facades). Treat those as canonical contracts—don’t rewrite them; instead, build `@core` so the mocks “just work.”

## Immediate Next Steps
1. **Routing + facades**: Layer in the Router/facade infrastructure so `Route`, `route()`, `view()`, and controller helpers finally function.
2. **Router + middleware integration**: Hook the router (once implemented) into the middleware pipeline so route-specific stacks (web/api/custom aliases) execute before controller handlers.
3. **Laravel-style Request/Response**: Extend the new request/response layer with deeper Laravel parity (route binding, files, response macros) as routing matures; ResponseFactory already converts plain controller return values (strings/objects/dates) into HTTP responses, ready for router integration.
4. **Inertia bridge**: Implement the server-side Inertia helpers (`inertia`, `optional`, shared props) expected by the controllers and Vue pages.
5. **Meaningful tests**: Replace placeholder feature/unit suites with routing + controller coverage.
6. **Docs parity**: Keep expanding docs (routing, middleware stack) and address tooling gaps (`lantern.ts`).

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
