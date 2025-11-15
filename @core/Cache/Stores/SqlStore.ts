import type { CacheStore } from "@core/Cache/Contracts";
import type { SQL } from "bun";
import { SQL as SqlClient } from "bun";

type SqlDriver = "mysql" | "pgsql" | "sqlite";

export type SqlConnectionConfig =
	| string
	| URL
	| ConstructorParameters<typeof SqlClient>[0];

export interface SqlStoreOptions {
	connection?: SqlConnectionConfig;
	table?: string;
}

type SqlRow = {
	value: string;
	expires_at: number | null;
};

export class SqlStore implements CacheStore {
	private client: SQL;
	private table: string;
	private driver: "mysql" | "postgres" | "sqlite";
	private ensureTablePromise: Promise<void>;

	constructor(
		driver: SqlDriver,
		private config: SqlStoreOptions,
	) {
		this.driver = this.resolveAdapter(driver);
		this.table = this.sanitizeIdentifier(this.config.table ?? "cache");
		this.client = this.createClient(this.config.connection);
		this.ensureTablePromise = this.ensureTable();
	}

	async get<T = unknown>(key: string): Promise<T | undefined> {
		await this.ensureTablePromise;
		const query = `SELECT value, expires_at FROM ${this.table} WHERE cache_key = ${this.placeholder(1)} LIMIT 1`;
		const rows = (await this.client.unsafe(query, [key])) as SqlRow[];
		const row = rows[0];
		if (!row) return undefined;

		if (row.expires_at && row.expires_at <= Date.now()) {
			await this.forget(key);
			return undefined;
		}

		return this.deserialize<T>(row.value);
	}

	async put<T = unknown>(
		key: string,
		value: T,
		seconds: number,
	): Promise<void> {
		await this.ensureTablePromise;
		const expiresAt = seconds > 0 ? Date.now() + seconds * 1000 : Date.now();
		const payload = this.serialize(value);
		const statement = this.upsertStatement();
		await this.client.unsafe(statement, [key, payload, expiresAt]);
	}

	async forever<T = unknown>(key: string, value: T): Promise<void> {
		await this.ensureTablePromise;
		const payload = this.serialize(value);
		const statement = this.upsertStatement();
		await this.client.unsafe(statement, [key, payload, null]);
	}

	async forget(key: string): Promise<boolean> {
		await this.ensureTablePromise;
		const exists = await this.hasKey(key);
		if (!exists) {
			return false;
		}

		const query = `DELETE FROM ${this.table} WHERE cache_key = ${this.placeholder(1)}`;
		await this.client.unsafe(query, [key]);
		return true;
	}

	private async hasKey(key: string): Promise<boolean> {
		await this.ensureTablePromise;
		const query = `SELECT 1 FROM ${this.table} WHERE cache_key = ${this.placeholder(1)} LIMIT 1`;
		const rows = await this.client.unsafe(query, [key]);
		return Array.isArray(rows) && rows.length > 0;
	}

	private serialize(value: unknown): string {
		return JSON.stringify(value);
	}

	private deserialize<T>(value: string): T {
		try {
			return JSON.parse(value) as T;
		} catch {
			return value as unknown as T;
		}
	}

	private sanitizeIdentifier(identifier: string): string {
		if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
			throw new Error(
				`Invalid table name "${identifier}". Use alphanumeric or underscore characters only.`,
			);
		}
		return identifier;
	}

	private resolveAdapter(driver: SqlDriver): "mysql" | "postgres" | "sqlite" {
		if (driver === "pgsql") return "postgres";
		return driver;
	}

	private placeholder(index: number): string {
		return this.driver === "postgres" ? `$${index}` : "?";
	}

	private upsertStatement(): string {
		const table = this.table;
		switch (this.driver) {
			case "postgres":
				return `INSERT INTO ${table} (cache_key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (cache_key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`;
			case "mysql":
				return `INSERT INTO ${table} (cache_key, value, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), expires_at = VALUES(expires_at)`;
			default:
				return `INSERT INTO ${table} (cache_key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`;
		}
	}

	private async ensureTable() {
		await this.client.connect();
		const table = this.table;
		if (this.driver === "postgres") {
			await this.client.unsafe(
				`CREATE TABLE IF NOT EXISTS ${table} (cache_key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at BIGINT NULL)`,
			);
		} else if (this.driver === "mysql") {
			await this.client.unsafe(
				`CREATE TABLE IF NOT EXISTS ${table} (
					cache_key VARCHAR(255) PRIMARY KEY,
					value LONGTEXT NOT NULL,
					expires_at BIGINT NULL
				)`,
			);
		} else {
			await this.client.unsafe(
				`CREATE TABLE IF NOT EXISTS ${table} (
					cache_key TEXT PRIMARY KEY,
					value TEXT NOT NULL,
					expires_at INTEGER NULL
				)`,
			);
		}
	}

	private createClient(connection?: SqlConnectionConfig): SQL {
		if (typeof connection === "string" || connection instanceof URL) {
			return new SqlClient(connection);
		}

		const baseOptions: Record<string, unknown> = {
			adapter: this.driver,
		};

		if (typeof connection === "object" && connection !== null) {
			return new SqlClient({
				...baseOptions,
				...connection,
			});
		}

		if (this.driver === "sqlite") {
			return new SqlClient({
				adapter: "sqlite",
				filename: ":memory:",
			});
		}

		throw new Error(
			`Connection configuration is required for the "${this.driver}" SQL cache store. Set stores.cache.${this.driver}.connection in config/cache.ts.`,
		);
	}
}
