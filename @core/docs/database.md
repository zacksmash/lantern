# Database

Lantern’s database layer intentionally mirrors Laravel’s “DB” documentation: configure named connections, run raw queries via a fluent facade, and manage transactions with familiar helpers. When you want Active Record style models, reach for [Mason](./mason.md) – it builds on the same manager and adopts Laravel’s API in TypeScript.

## Configuration

`config/database.ts` defines your connections:

- `default` – fallback connection.
- `connections.<name>` – driver (`sqlite`, `mysql`, `pgsql`), optional `url`, and Bun `SQL` options.

```ts
export default {
	default: env("DB_CONNECTION", "sqlite"),
	connections: {
		sqlite: {
			driver: "sqlite",
			options: { adapter: "sqlite", filename: env("DB_DATABASE", ":memory:") },
		},
		mysql: {
			driver: "mysql",
			options: {
				adapter: "mysql",
				hostname: env("DB_HOST", "127.0.0.1"),
				username: env("DB_USERNAME", "root"),
				password: env("DB_PASSWORD", ""),
				database: env("DB_DATABASE", "lantern"),
			},
		},
	},
};
```

- Use DSNs (`mysql://user:pass@host/db`) via the `url` property if you prefer.
- Add additional connections by expanding the `connections` object.

## Accessing Connections

`DatabaseManager` lives in `@core/Database/DatabaseManager.ts` and is bound under `ContainerTokens.DatabaseManager`. The `db`/`DB` facade mirrors Laravel’s API:

```ts
import { db } from "@core/Support/Facades/DB";

// Default connection as a tagged template
const users = await db()`SELECT * FROM users WHERE active = ${true}`;

// Fluent helpers (string + bindings)
const archived = await DB.select("select * from posts where archived = ?", [
	true,
]);
const post = await DB.selectOne("select * from posts where id = ?", [42]);
await DB.insert("insert into logs (payload) values (?)", [JSON.stringify(data)]);
await DB.update("update users set last_login = ? where id = ?", [
	new Date().toISOString(),
	42,
]);
await DB.delete("delete from jobs where attempts > ?", [3]);

// Custom connection
await DB.connection("mysql")`INSERT INTO reports (payload) VALUES (${JSON.stringify(
	data,
)})`;

// Using/transactions
await DB.using("pgsql", async (sql) => {
	await sql`DELETE FROM jobs WHERE id = ${id}`;
});
await DB.transaction(async (sql) => {
	await sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`;
	await sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`;
});

// Raw helper (alias to the default connection)
await DB.raw`SELECT 1`;
```

Because the underlying object is Bun’s `SQL` client, you inherit template literal queries, streaming, prepared statements, and driver-level pooling for MySQL/PostgreSQL.

## Running Queries & Transactions

Lantern leans on Bun’s native transaction support via `DB.transaction()` or `db().begin`.

Each `SQL` instance uses the driver’s recommended pooling strategy, so reusing connections via the facade is free.

## Service Provider

`DatabaseServiceProvider` registers the manager once per process. Connection instances are cached inside the manager so you don’t pay setup costs on every request.

## Testing Recommendations

- Point `DB_CONNECTION` to `sqlite` with `:memory:` for super-fast tests.
- Define per-test connections (e.g., `connections.testing`) and call `db.connection("testing")` inside your test harness.

Lantern’s database API aims to feel like the Laravel docs linked above: configure connections in one file, call `DB::connection()`-style helpers, and run raw SQL through a fluent facade until an ORM joins the stack.***
