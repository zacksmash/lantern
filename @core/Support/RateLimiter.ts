interface RateLimitOptions {
	attempts: number;
	decaySeconds: number;
}

export class RateLimiter {
	private static limiters: Map<
		string,
		{ options: RateLimitOptions; hits: Map<string, number[]> }
	> = new Map();

	static for(name: string, options: RateLimitOptions): RateLimiter {
		if (!RateLimiter.limiters.has(name)) {
			RateLimiter.limiters.set(name, { options, hits: new Map() });
		}
		return new RateLimiter(name);
	}

	private constructor(private readonly name: string) {}

	private get bucket() {
		return RateLimiter.limiters.get(this.name)!;
	}

	async hit(key: string): Promise<boolean> {
		const now = Date.now();
		const cutoff = now - this.bucket.options.decaySeconds * 1000;
		const hits = this.bucket.hits.get(key) ?? [];
		const recent = hits.filter((timestamp) => timestamp > cutoff);
		if (recent.length >= this.bucket.options.attempts) {
			this.bucket.hits.set(key, recent);
			return false;
		}

		recent.push(now);
		this.bucket.hits.set(key, recent);
		return true;
	}
}
