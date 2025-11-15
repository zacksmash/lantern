import type { CacheEntry, CacheStore } from "@core/Cache/Contracts";

export class MemoryStore implements CacheStore {
	private store = new Map<string, CacheEntry<unknown>>();

	constructor(private pruneInterval = 60000) {
		setInterval(() => this.prune(), this.pruneInterval).unref?.();
	}

	async get<T = unknown>(key: string): Promise<T | undefined> {
		const entry = this.store.get(key);
		if (!entry) return undefined;

		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key);
			return undefined;
		}

		return entry.value as T;
	}

	async put<T = unknown>(key: string, value: T, seconds: number) {
		const expiresAt = seconds <= 0 ? Date.now() : Date.now() + seconds * 1000;
		this.store.set(key, { value, expiresAt });
	}

	async forever<T = unknown>(key: string, value: T) {
		this.store.set(key, { value, expiresAt: null });
	}

	async forget(key: string): Promise<boolean> {
		return this.store.delete(key);
	}

	private prune() {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (entry.expiresAt && entry.expiresAt <= now) {
				this.store.delete(key);
			}
		}
	}
}
