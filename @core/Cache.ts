import { type RedisClient, redis } from 'bun';

export class Cache {
	async set(key: string, value: any) {
		await redis.set(key, JSON.stringify(value));
	}

	async get(key: string): Promise<any | null> {
		const value = await redis.get(key);
		return value ? JSON.parse(value) : null;
	}

	async delete(key: string) {
		await redis.del(key);
	}

	async exists(key: string): Promise<boolean> {
		return await redis.exists(key);
	}

	async expire(key: string, seconds: number) {
		await redis.expire(key, seconds);
	}

	do(): RedisClient {
		return redis;
	}
}

export function cache(): Cache {
	return new Cache();
}
