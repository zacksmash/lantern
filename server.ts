import { ErrorHandler } from "@core/Http/ErrorHandler";
import web from "@root/routes/web.ts";

const isProduction =
	(Bun.env.APP_ENV ?? Bun.env.NODE_ENV ?? "development") === "production";

const errorHandler = new ErrorHandler({
	debug: !isProduction,
	appName: Bun.env.APP_NAME ?? "Lantern",
});

export const server = Bun.serve({
	routes: web,
	async fetch(request: Request) {
		try {
			return new Response("Unmatched route", {
				status: 404,
				statusText: request.url,
			});
		} catch (error) {
			return errorHandler.handle(error, {
				request,
				allowDebugRethrow: true,
			});
		}
	},
	error(error: unknown) {
		return errorHandler.handle(error, {
			allowDebugRethrow: false,
		});
	},
});
