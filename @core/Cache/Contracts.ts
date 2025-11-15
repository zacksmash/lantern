export interface CacheStore {
	get<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
	put<T = unknown>(
		key: string,
		value: T,
		seconds: number,
	): Promise<void> | void;
	forever<T = unknown>(key: string, value: T): Promise<void> | void;
	forget(key: string): Promise<boolean> | boolean;
}

export interface CacheEntry<T = unknown> {
	value: T;
	expiresAt: number | null;
}
