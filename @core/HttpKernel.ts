import { app } from '@root/bootstrap/app';

export class HttpKernel {
	constructor(private request: Request) {}

	async boot(): Promise<Response> {
		const maintenance = Bun.file('storage/app/.maintenance');

		if (await maintenance.exists()) {
			return new Response('The application is under maintenance.', {
				status: 503,
			});
		}

		// kernel -> bootstrap -> middleware -> route -> controller -> response

		// Request
		//   -> Kernel (start request scope)
		//     -> Bootstrappers
		//       -> Middleware (global)
		//         -> Router
		//           -> Route middleware
		//             -> Controller
		//               -> Service layer
		//                 -> View or JSON
		//   -> Kernel (end scope)
		// -> Response

		return app.handleRequest(this.request);
	}
}
