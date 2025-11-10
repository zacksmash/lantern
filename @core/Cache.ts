import { redis } from 'bun';

export class Cache {
	async set(key: string, value: any) {
		await redis.set(key, JSON.stringify(value));
	}

	async get(key: string): Promise<any | null> {
		const value = await redis.get(key);
		return value ? JSON.parse(value) : null;
	}
}
