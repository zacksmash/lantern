import { CacheRepository } from "@core/Cache/CacheRepository";
import type { CacheStore } from "@core/Cache/Contracts";
import { MemoryStore } from "@core/Cache/Stores/MemoryStore";
import {
	RedisStore,
	type RedisStoreOptions,
} from "@core/Cache/Stores/RedisStore";
import { SqlStore, type SqlStoreOptions } from "@core/Cache/Stores/SqlStore";

type MemoryConfig = {
	driver: "memory";
	prefix?: string;
};

type RedisConfig = {
	driver: "redis";
	prefix?: string;
	options?: RedisStoreOptions;
};

type SqlConfig = {
	driver: "mysql" | "pgsql" | "sqlite";
	prefix?: string;
	connection?: SqlStoreOptions["connection"];
	table?: string;
};

type StoreConfig = MemoryConfig | RedisConfig | SqlConfig;

type CacheConfig = {
	default: string;
	prefix: string;
	stores: Record<string, StoreConfig>;
};

export class CacheManager {
	private stores = new Map<string, CacheRepository>();
	private config: CacheConfig;

	constructor(config?: CacheConfig) {
		this.config = config ?? (globalThis.config?.("cache") as CacheConfig);
		if (!this.config) {
			throw new Error("Cache configuration is missing.");
		}
	}

	store(name?: string): CacheRepository {
		const storeName = name ?? this.config.default;

		if (this.stores.has(storeName)) {
			return this.stores.get(storeName)!;
		}

		const repository = this.resolve(storeName);
		this.stores.set(storeName, repository);
		return repository;
	}

	private resolve(name: string): CacheRepository {
		const storeConfig = this.config.stores[name];

		if (!storeConfig) {
			throw new Error(`Cache store "${name}" is not configured.`);
		}

		const store = this.createStore(storeConfig);
		const prefix = storeConfig.prefix ?? this.config.prefix ?? "cache:";
		return new CacheRepository(
			store,
			prefix.endsWith(":") ? prefix : `${prefix}:`,
		);
	}

	private createStore(config: StoreConfig): CacheStore {
		switch (config.driver) {
			case "memory":
				return new MemoryStore();
			case "redis":
				return new RedisStore(config.options);
			case "mysql":
			case "pgsql":
			case "sqlite":
				return new SqlStore(config.driver, {
					connection: config.connection,
					table: config.table,
				});
			default:
				throw new Error(
					`Cache driver "${(config as StoreConfig).driver}" is not supported.`,
				);
		}
	}
}
