import type { CacheStore } from "@core/Cache/Contracts";
import { RedisClient } from "bun";

export interface RedisStoreOptions {
	url?: string;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: number;
	tls?: boolean;
}

export class RedisStore implements CacheStore {
	private client: RedisClient;
	private connectPromise: Promise<void> | null = null;

	constructor(private options: RedisStoreOptions = {}) {
		const url = options.url || this.buildUrl();
		const tlsOption =
			typeof options.tls === "boolean" ? options.tls : undefined;

		this.client = new RedisClient(url, {
			tls: tlsOption,
		});
	}

	async get<T = unknown>(key: string): Promise<T | undefined> {
		await this.ensureConnection();
		const value = await this.client.get(key);
		if (value === null) return undefined;
		return this.deserialize<T>(value);
	}

	async put<T = unknown>(key: string, value: T, seconds: number) {
		if (seconds <= 0) {
			await this.forget(key);
			return;
		}

		await this.ensureConnection();
		await this.client.set(key, this.serialize(value), "PX", seconds * 1000);
	}

	async forever<T = unknown>(key: string, value: T) {
		await this.ensureConnection();
		await this.client.set(key, this.serialize(value));
	}

	async forget(key: string): Promise<boolean> {
		await this.ensureConnection();
		const deleted = await this.client.del(key);
		return deleted > 0;
	}

	private async ensureConnection() {
		if (this.client.connected) {
			return;
		}

		if (!this.connectPromise) {
			this.connectPromise = this.client.connect().finally(() => {
				this.connectPromise = null;
			});
		}

		await this.connectPromise;
	}

	private serialize(value: unknown): string {
		return JSON.stringify(value);
	}

	private deserialize<T>(payload: string): T {
		try {
			return JSON.parse(payload) as T;
		} catch {
			return payload as unknown as T;
		}
	}

	private buildUrl(): string {
		const scheme = this.options.tls ? "rediss" : "redis";
		const host = this.options.host ?? "127.0.0.1";
		const port = this.options.port ?? 6379;
		const db =
			typeof this.options.database === "number"
				? `/${this.options.database}`
				: "";
		const auth = this.buildAuthSegment();

		return `${scheme}://${auth}${host}:${port}${db}`;
	}

	private buildAuthSegment(): string {
		const username = this.options.username
			? encodeURIComponent(this.options.username)
			: "";
		const password = this.options.password
			? encodeURIComponent(this.options.password)
			: "";

		if (!username && !password) {
			return "";
		}

		if (username && password) {
			return `${username}:${password}@`;
		}

		if (password) {
			return `:${password}@`;
		}

		return `${username}@`;
	}
}
