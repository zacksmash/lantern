# Codex Reference Notes

This directory summarizes how the Lantern framework is assembled so future design work can reference agreed upon conventions quickly.

- `architecture.md` — end-to-end request lifecycle, container bindings, and other server internals.
- `extensions.md` — how to add controllers, middleware, providers, config, and routes safely.
- `frontend.md` — client build pipeline (Vite, Vue, Inertia) plus asset structure.
- `gaps.md` — open problems and design questions discovered during the initial scan.

Keep these docs close to the real implementation. When making notable architectural changes, update both the relevant source code and these notes so they stay trustworthy.
