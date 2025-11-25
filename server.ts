import { ErrorHandler } from "@core/Http/ErrorHandler";
import { runWithRequest } from "@core/Http/Request";
import routes from "@root/routes/web.ts";

const isProduction =
	(Bun.env.APP_ENV ?? Bun.env.NODE_ENV ?? "development") === "production";

const errorHandler = new ErrorHandler({
	debug: !isProduction,
	appName: Bun.env.APP_NAME ?? "Lantern",
});

export const server = Bun.serve({
	async fetch(request: Request) {
		try {
			return await runWithRequest(request, async (lanternRequest) => {
				const handler = routes[lanternRequest.path];

				if (!handler) {
					return new Response("Unmatched route", {
						status: 404,
						statusText: request.url,
					});
				}

				return handler(lanternRequest);
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
