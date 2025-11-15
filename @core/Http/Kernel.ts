import "@core/Globals";
import { join, normalize, resolve } from "node:path";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import { middlewareManager } from "@core/Http/Middleware/Manager";
import type { HttpRequest } from "@core/Http/Request";
import { app } from "@root/bootstrap/app";

export class HttpKernel {
	constructor(private request: HttpRequest) {}

	async boot(): Promise<Response> {
		const maintenance = await this.checkForMaintenanceMode();
		if (maintenance) return maintenance;

		const staticResponse = await this.checkForStaticRequest();
		if (staticResponse) return staticResponse;

		return this.handleMiddlewareStack();
	}

	private async handleMiddlewareStack(): Promise<Response> {
		const container = app.getContainer();
		const globalMiddleware = middlewareManager.getGlobalMiddleware(container);
		const routeMatch = app.router.matchRoute(this.request);
		const routeMiddleware: Middleware[] = routeMatch
			? middlewareManager.getRouteMiddleware(
					routeMatch.route.getMiddleware(),
					container,
				)
			: [];

		const stack = this.buildMiddlewareStack(
			globalMiddleware.concat(routeMiddleware),
			() => app.handleRequest(this.request),
		);

		return stack();
	}

	private buildMiddlewareStack(
		middleware: Middleware[],
		finalHandler: () => Promise<Response>,
	): () => Promise<Response> {
		return middleware.reduceRight((next, layer) => {
			return () => layer.handle(this.request, next);
		}, finalHandler);
	}

	private async checkForMaintenanceMode(): Promise<Response | null> {
		const maintenance = Bun.file("storage/app/.maintenance");

		if (await maintenance.exists()) {
			return new Response("The application is under maintenance.", {
				status: 503,
			});
		}

		return null;
	}

	private async checkForStaticRequest(): Promise<Response | null> {
		const rawPathname = this.request.urlInstance.pathname;
		let pathname: string;
		try {
			pathname = decodeURIComponent(rawPathname);
		} catch {
			return null;
		}

		const basePath = app.getBasePath?.() ?? process.cwd();
		const publicRoot = resolve(join(basePath, "public"));
		const normalizedPath = normalize(join(publicRoot, pathname));

		if (!normalizedPath.startsWith(publicRoot)) {
			return null;
		}

		const file = Bun.file(normalizedPath);

		if (await file.exists()) {
			return new Response(file);
		}

		return null;
	}
}
