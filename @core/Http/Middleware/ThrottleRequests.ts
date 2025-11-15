import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

type Bucket = {
	hits: number;
	resetTime: number;
};

const buckets = new Map<string, Bucket>();

export class ThrottleRequests implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const limit = this.getLimit();
		const decay = this.getDecaySeconds();
		const key = this.resolveKey(request);
		const bucket = this.resolveBucket(key, decay);

		if (bucket.hits >= limit) {
			return this.tooMany(bucket);
		}

		bucket.hits += 1;
		const response = await next();
		return this.appendHeaders(response, bucket, limit);
	}

	protected getLimit(): number {
		const configured = Number(env("THROTTLE_LIMIT", "60"));
		return Number.isFinite(configured) && configured > 0 ? configured : 60;
	}

	protected getDecaySeconds(): number {
		const configured = Number(env("THROTTLE_DECAY_SECONDS", "60"));
		return Number.isFinite(configured) && configured > 0 ? configured : 60;
	}

	protected getIdentifier(): string {
		return this.constructor.name.toLowerCase();
	}

	protected resolveKey(request: HttpRequest): string {
		const forwarded = request.header("x-forwarded-for");
		const realIp =
			forwarded?.split(",")[0]?.trim() ??
			request.header("x-real-ip") ??
			request.header("cf-connecting-ip") ??
			"anonymous";

		return `${this.getIdentifier()}:${realIp}`;
	}

	private resolveBucket(key: string, decay: number): Bucket {
		const now = Date.now();
		const existing = buckets.get(key);

		if (existing && existing.resetTime > now) {
			return existing;
		}

		const bucket: Bucket = {
			hits: 0,
			resetTime: now + decay * 1000,
		};

		buckets.set(key, bucket);
		return bucket;
	}

	private tooMany(bucket: Bucket): Response {
		const retryAfter = Math.max(
			0,
			Math.ceil((bucket.resetTime - Date.now()) / 1000),
		);
		return new Response("Too Many Requests", {
			status: 429,
			headers: {
				"Retry-After": retryAfter.toString(),
				"X-RateLimit-Reset": Math.ceil(bucket.resetTime / 1000).toString(),
			},
		});
	}

	private appendHeaders(
		response: Response,
		bucket: Bucket,
		limit: number,
	): Response {
		const headers = new Headers(response.headers);
		const remaining = Math.max(limit - bucket.hits, 0);

		headers.set("X-RateLimit-Limit", limit.toString());
		headers.set("X-RateLimit-Remaining", remaining.toString());
		headers.set(
			"X-RateLimit-Reset",
			Math.ceil(bucket.resetTime / 1000).toString(),
		);

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}
}

export class ApiThrottleRequests extends ThrottleRequests {
	protected override getIdentifier(): string {
		return "api";
	}

	protected override getLimit(): number {
		const fallback = super.getLimit();
		const configured = Number(env("THROTTLE_API_LIMIT", fallback.toString()));
		return Number.isFinite(configured) && configured > 0
			? configured
			: fallback;
	}

	protected override getDecaySeconds(): number {
		const fallback = super.getDecaySeconds();
		const configured = Number(env("THROTTLE_API_DECAY", fallback.toString()));
		return Number.isFinite(configured) && configured > 0
			? configured
			: fallback;
	}
}
