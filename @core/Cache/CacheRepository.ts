import type { CacheStore } from "@core/Cache/Contracts";

export class CacheRepository {
	constructor(
		private store: CacheStore,
		private prefix: string,
	) {}

	async get<T = unknown>(key: string, fallback?: T): Promise<T | undefined> {
		const value = await this.store.get<T>(this.key(key));
		if (typeof value === "undefined") {
			return fallback;
		}
		return value;
	}

	async put<T = unknown>(key: string, value: T, seconds: number) {
		await this.store.put(this.key(key), value, seconds);
	}

	async forever<T = unknown>(key: string, value: T) {
		await this.store.forever(this.key(key), value);
	}

	async remember<T = unknown>(
		key: string,
		seconds: number,
		callback: () => Promise<T> | T,
	): Promise<T> {
		const existing = await this.get<T>(key);
		if (typeof existing !== "undefined") {
			return existing;
		}

		const value = await callback();
		await this.put(key, value, seconds);
		return value;
	}

	async forget(key: string): Promise<boolean> {
		return await this.store.forget(this.key(key));
	}

	private key(key: string): string {
		return `${this.prefix}${key}`;
	}
}
