import { Config } from '@core/Config';
import { Container } from '@core/Container';
import { CacheProvider } from '@core/Providers/CacheProvider';
import { DatabaseProvider } from '@core/Providers/DatabaseProvider';
import type { Route } from '@core/Routing/Route';
import { Router } from '@core/Routing/Router';
import { routes } from '@root/routes';
import '@core/Globals';

export class Application {
	public basePath: string | null;
	public request: Request | null;
	public container = new Container();
	public router = new Router();
	public providers = [new DatabaseProvider(), new CacheProvider()];

	constructor() {
		this.basePath = null;
		this.request = null;

		// Bootstrap application components here
		// ---
		// Configuration loading ✅
		Config.load();

		// IoC Container initialization ✅
		// Register service providers ✅
		for (const provider of this.providers) {
			if (typeof (provider as any).register === 'function') {
				(provider as any).register(this.container);
			}
		}

		// Boot service providers ✅
		for (const provider of this.providers) {
			if (typeof (provider as any).boot === 'function') {
				(provider as any).boot(this.container);
			}
		}

		// Exception handling setup
		// Routes setup ✅
	}

	configure(basePath: string): this {
		this.basePath = basePath;

		return this;
	}

	withRouting(): this {
		routes(this.router);
		return this;
	}

	withMiddleware(): this {
		// Integrate middleware capabilities here
		return this;
	}

	withExceptions(): this {
		// Integrate error handling capabilities here
		return this;
	}

	create() {
		return this;
	}

	async handleRequest(request: Request): Promise<Response> {
		this.request = request;

		const url = new URL(request.url);
		const route = this.router.match(request.method, url.pathname);

		if (!route) {
			return new Response('Not Found', { status: 404 });
		}

		return this.dispatch(route, request);
	}

	async dispatch(route: Route, request: Request): Promise<Response> {
		const action = route.action;

		if (typeof action === 'function') {
			return action(request);
		}

		if (Array.isArray(action)) {
			const [ControllerClass, method] = action;
			const controller = new ControllerClass();
			return controller[method](request);
		}

		throw new Error('Invalid route action');
	}
}
