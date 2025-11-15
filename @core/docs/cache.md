# Cache

Lantern provides a cache API patterned after Laravel’s repository + store design. Every store shares the same interface so you can swap drivers without changing application code.

## Configuration

`config/cache.ts` defines everything:

- `default` – name of the driver used when `cache.store()` receives no argument.
- `prefix` – base key prefix (e.g., `lantern_cache:`). Individual stores can override via their own `prefix`.
- `stores.memory` – fast in-memory Map, ideal for tests or local development.
- `stores.redis` – Bun’s built-in `RedisClient`. Configure via DSNs or host/port/password options.
- `stores.mysql`, `stores.pgsql`, `stores.sqlite` – SQL-backed stores powered by Bun’s `SQL` client.

Add custom stores by extending `CacheStore` and registering them inside the config file.

## CacheManager & Repository API

`CacheManager` is container-bound under `ContainerTokens.CacheManager` and returns `CacheRepository` instances:

```ts
import { cache } from "@core/Support/Facades/Cache";

await cache()
	.store() // default driver
	.remember("user:1", 60, async () => {
		const user = await User.find(1);
		return user.toJSON();
	});
```

Repository methods mirror Laravel:

| Method | Description |
| --- | --- |
| `get(key, fallback?)` | Fetch a value or fallback to `undefined`/provided default. |
| `put(key, value, seconds)` | Store a value for the given TTL. |
| `forever(key, value)` | Store without expiration. |
| `remember(key, seconds, callback)` | Atomically compute + cache a value. |
| `forget(key)` | Delete and return `true`/`false`. |

Values are JSON-serialized for remote stores (Redis/SQL) and stored as-is for the memory driver.

## Redis Driver

`RedisStore` talks directly to Bun’s `RedisClient`:

- Accepts either a `url` (`redis://user:pass@host:port/db`) or discrete connection options.
- Supports TLS via `tls: true`.
- Uses `PX` expirations so TTLs are accurate to the millisecond.
- Automatically cleans up expired entries on read.

Because Redis is just another cache store, you can run sessions or queues on the same server by configuring new stores/providers.

## SQL Drivers

`SqlStore` works with SQLite, MySQL, and PostgreSQL via Bun’s `SQL` helper. Each store automatically:

1. Ensures the cache table exists (`cache_key`, `value`, `expires_at`).
2. Upserts rows using the appropriate dialect syntax.
3. Deletes expired rows on read or `forget`.

Point `stores.sqlite.connection` to a filename to persist across restarts, or pass connection objects for MySQL/PostgreSQL (`hostname`, `username`, `password`, etc.).

## When To Use Which Driver

| Driver | Use case |
| --- | --- |
| `memory` | Tests, CLI commands, or single-process apps. Data is lost on restart. |
| `redis` | Shared cache for distributed deployments or session storage. |
| `sqlite` | Quick persistence on a single server without external dependencies. |
| `mysql` / `pgsql` | When you already run those databases and want centralized caching. |

The cache API intentionally matches Laravel’s ergonomics, so swapping drivers is as simple as updating `config/cache.ts` or calling `cache().store("redis")`.***
