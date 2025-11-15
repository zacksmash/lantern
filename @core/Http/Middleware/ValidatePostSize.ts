import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

const DEFAULT_LIMIT = 10 * 1024 * 1024;

export class ValidatePostSize implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const contentLength = request.header("content-length");
		const transferEncoding = request.header("transfer-encoding");

		if (!contentLength || transferEncoding === "chunked") {
			return next();
		}

		const limit = this.getLimitInBytes();
		const length = Number(contentLength);

		if (!Number.isFinite(length) || length <= limit) {
			return next();
		}

		return new Response("Payload too large.", {
			status: 413,
		});
	}

	private getLimitInBytes(): number {
		const configured = env("POST_MAX_SIZE", "10mb");
		const parsed = this.parseByteSize(configured);
		return parsed ?? DEFAULT_LIMIT;
	}

	private parseByteSize(value: string): number | null {
		const match = value
			.trim()
			.toLowerCase()
			.match(/^(\d+(?:\.\d+)?)(b|kb|kib|mb|mib|gb|gib)?$/);
		if (!match) {
			return null;
		}

		const quantity = Number(match[1]);
		if (!Number.isFinite(quantity)) {
			return null;
		}

		const unit = match[2] ?? "b";
		const multipliers: Record<string, number> = {
			b: 1,
			kb: 1000,
			kib: 1024,
			mb: 1000 * 1000,
			mib: 1024 * 1024,
			gb: 1000 * 1000 * 1000,
			gib: 1024 * 1024 * 1024,
		};

		const multiplier = multipliers[unit];
		if (!multiplier) {
			return null;
		}

		return Math.floor(quantity * multiplier);
	}
}
