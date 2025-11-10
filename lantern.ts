import { HttpKernel } from '@core/HttpKernel';
import { RequestContext } from '@core/RequestContext';

async function serveStatic(request: Request): Promise<Response | null> {
	const url = new URL(request.url);
	const pathname = url.pathname;

	const file = Bun.file(`./public${pathname}`);

	if (await file.exists()) {
		return new Response(file);
	}

	return null;
}

const server = Bun.serve({
	fetch: async (request: Request) => {
		const staticResponse = await serveStatic(request);
		if (staticResponse) {
			return staticResponse;
		}

		return RequestContext.run(request, async () => {
			return new HttpKernel(request).boot();
		});
	},
});

console.log(`Server running at ${server.url}`);
