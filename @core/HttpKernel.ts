import "@core/Globals";
import type { Middleware } from "@core/Foundation/Middleware";
import { Middlewares } from "@core/Foundation/MiddlewaresManifest";
import { app } from "@root/bootstrap/app";

export class HttpKernel {
	constructor(private request: Request) {}

	async boot(): Promise<Response> {
		const maintenance = await this.checkForMaintenanceMode();
		if (maintenance) return maintenance;

		const staticResponse = await this.checkForStaticRequest();
		if (staticResponse) return staticResponse;

		return this.handleMiddlewareStack();
	}

	private async handleMiddlewareStack(): Promise<Response> {
		const middleware: Middleware[] = Middlewares.map(
			(middleware) => new middleware(),
		);

		const stack = this.buildMiddlewareStack(middleware, () =>
			app.handleRequest(this.request),
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
		const url = new URL(this.request.url);
		const pathname = url.pathname;

		const file = Bun.file(`./public${pathname}`);

		if (await file.exists()) {
			return new Response(file);
		}

		return null;
	}
}
