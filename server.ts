import web from "@root/routes/web.ts";

export const server = Bun.serve({
	routes: web,
	async fetch(request: Request) {
		return new Response("Unmatched route", {
			status: 404,
			statusText: request.url,
		});
	},
	error(error: unknown) {
		return new Response("Internal Server Error", {
			status: 500,
			statusText: String(error),
		});
	},
});
