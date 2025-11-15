import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

const DEFAULT_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_HEADERS =
	"Accept,Accept-Language,Content-Language,Content-Type,Authorization,X-Requested-With";
const DEFAULT_EXPOSE_HEADERS =
	"Cache-Control,Content-Language,Content-Type,Expires,Last-Modified,Pragma";

export class HandleCors implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const allowedOrigins = this.parseList(env("CORS_ALLOWED_ORIGINS", "*"));
		const allowCredentials = env("CORS_ALLOW_CREDENTIALS", "false") === "true";
		const maxAge = env("CORS_MAX_AGE", "600");
		const allowedMethods = env("CORS_ALLOWED_METHODS", DEFAULT_METHODS);
		const allowedHeaders =
			env("CORS_ALLOWED_HEADERS", "") ||
			request.header("access-control-request-headers") ||
			DEFAULT_HEADERS;
		const exposedHeaders = env("CORS_EXPOSE_HEADERS", DEFAULT_EXPOSE_HEADERS);

		const origin = request.header("origin");
		const resolvedOrigin = this.resolveOrigin(origin, allowedOrigins);

		const corsHeaders = this.buildHeaders({
			origin: resolvedOrigin,
			allowCredentials,
			allowedMethods,
			allowedHeaders,
			maxAge,
			exposedHeaders,
			shouldVary: resolvedOrigin !== "*" && allowedOrigins.length > 1,
		});

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		const response = await next();
		return this.appendHeaders(response, corsHeaders);
	}

	private parseList(value: string): string[] {
		if (!value) return [];
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}

	private resolveOrigin(
		origin: string | null,
		allowed: string[],
	): string | null {
		if (allowed.length === 0) {
			return origin;
		}

		if (allowed.includes("*")) {
			return "*";
		}

		if (!origin) {
			return null;
		}

		return allowed.some((pattern) => this.matchesOrigin(origin, pattern))
			? origin
			: null;
	}

	private matchesOrigin(origin: string, pattern: string): boolean {
		if (pattern === "*") return true;
		if (!pattern.includes("*")) {
			return pattern === origin;
		}

		const escaped = pattern
			.split("*")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");

		return new RegExp(`^${escaped}$`).test(origin);
	}

	private buildHeaders(options: {
		origin: string | null;
		allowCredentials: boolean;
		allowedMethods: string;
		allowedHeaders: string;
		maxAge: string;
		exposedHeaders: string;
		shouldVary: boolean;
	}): Headers {
		const headers = new Headers();

		if (options.origin) {
			headers.set("Access-Control-Allow-Origin", options.origin);
		}

		if (options.allowCredentials && options.origin !== "*") {
			headers.set("Access-Control-Allow-Credentials", "true");
		}

		if (options.allowedMethods) {
			headers.set("Access-Control-Allow-Methods", options.allowedMethods);
		}

		if (options.allowedHeaders) {
			headers.set("Access-Control-Allow-Headers", options.allowedHeaders);
		}

		if (options.exposedHeaders) {
			headers.set("Access-Control-Expose-Headers", options.exposedHeaders);
		}

		if (options.maxAge) {
			headers.set("Access-Control-Max-Age", options.maxAge);
		}

		if (options.shouldVary) {
			headers.set("Vary", "Origin");
		}

		return headers;
	}

	private appendHeaders(response: Response, headersToAdd: Headers): Response {
		const headers = new Headers(response.headers);

		for (const [key, value] of headersToAdd.entries()) {
			headers.set(key, value);
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}
}
