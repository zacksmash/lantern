import type { SQL } from "bun";
import { SQL as SqlClient } from "bun";

type ConnectionDriver = "sqlite" | "mysql" | "pgsql";

type ConnectionConfig = {
	driver: ConnectionDriver;
	url?: string | URL;
	options?: Record<string, unknown>;
};

type DatabaseConfig = {
	default: string;
	connections: Record<string, ConnectionConfig>;
};

export class DatabaseManager {
	private connections = new Map<string, SQL>();
	private config: DatabaseConfig;

	constructor(config?: DatabaseConfig) {
		this.config = config ?? (globalThis.config?.("database") as DatabaseConfig);
		if (!this.config) {
			throw new Error("Database configuration is missing.");
		}
	}

	connection(name?: string): SQL {
		const connectionName = name ?? this.config.default;

		if (this.connections.has(connectionName)) {
			return this.connections.get(connectionName)!;
		}

		const connection = this.createConnection(connectionName);
		this.connections.set(connectionName, connection);
		return connection;
	}

	private createConnection(name: string): SQL {
		const config = this.config.connections?.[name];

		if (!config) {
			throw new Error(`Database connection "${name}" is not configured.`);
		}

		const adapter = this.mapAdapter(config.driver);

		if (config.url) {
			return new SqlClient(config.url, {
				adapter,
				...(config.options ?? {}),
			});
		}

		const options = { adapter, ...(config.options ?? {}) };
		return new SqlClient(options);
	}

	private mapAdapter(
		driver: ConnectionDriver,
	): "sqlite" | "mysql" | "postgres" {
		switch (driver) {
			case "pgsql":
				return "postgres";
			case "mysql":
				return "mysql";
			default:
				return "sqlite";
		}
	}
}
