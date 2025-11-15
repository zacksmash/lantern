import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export class TrustProxies implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const protocol = this.firstForwardedValue(request, "x-forwarded-proto");
		const prefix = this.firstForwardedValue(request, "x-forwarded-prefix");
		const host =
			this.firstForwardedValue(request, "x-forwarded-host") ??
			this.firstForwardedValue(request, "x-forwarded-server");
		const port = this.firstForwardedValue(request, "x-forwarded-port");

		request.applyProxyOverrides({
			scheme: protocol ?? undefined,
			host: host ?? undefined,
			port: port ?? undefined,
			prefix: prefix ?? undefined,
		});

		return next();
	}

	private firstForwardedValue(
		request: HttpRequest,
		header: string,
	): string | null {
		const value = request.header(header);
		if (!value) return null;

		const first = value.split(",")[0]?.trim();
		return first || null;
	}
}
