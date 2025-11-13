import '@core/Globals';
import { app } from '@root/bootstrap/app';

export class HttpKernel {
	constructor(private request: Request) {}

	async handle(): Promise<Response> {
		await this.checkForMaintenanceMode();

		const staticRequest = await this.checkForStaticRequest();
		if (staticRequest) return staticRequest;

		return await app.handleRequest(this.request);
	}

	private async checkForStaticRequest(): Promise<Response | void> {
		const url = new URL(this.request.url);
		const pathname = url.pathname;

		const file = Bun.file(`./public${pathname}`);

		if (await file.exists()) {
			return new Response(file);
		}
	}

	private async checkForMaintenanceMode(): Promise<Response | null> {
		const maintenance = Bun.file('storage/app/.maintenance');

		if (await maintenance.exists()) {
			return new Response('The application is under maintenance.', {
				status: 503,
			});
		}

		return null;
	}
}
