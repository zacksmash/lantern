import { HttpKernel } from '@core/HttpKernel';
import { RequestContext } from '@core/RequestContext';


Bun.serve({
	development: process.env.APP_ENV === 'development',
	fetch: async (request: Request) => {
		return await RequestContext.run(request, async () => {
			const res = await new HttpKernel(request).handle();

			if (res instanceof Response) return res;

			return new Response("Internal Server Error", { status: 500 });
		});
	},
	error(err: unknown) {
		if (err instanceof Response) return err;

		throw err;
	}
});
