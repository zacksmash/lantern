export const server = Bun.serve({
	async fetch(request: Request) {
		return new Response("Hello, World!");
	},
	error(error: unknown) {
		return new Response("Internal Server Error", { status: 500 });
	},
});
