import { Route, type RouteAction } from '@core/Routing/Route';

export class Router {
	routes: Route[] = [];

	get(path: string, action: RouteAction) {
		return this.addRoute('GET', path, action);
	}

	post(path: string, action: RouteAction) {
		return this.addRoute('POST', path, action);
	}

	put(path: string, action: RouteAction) {
		return this.addRoute('PUT', path, action);
	}

	delete(path: string, action: RouteAction) {
		return this.addRoute('DELETE', path, action);
	}

	addRoute(method: string, path: string, action: RouteAction) {
		const route = new Route(method, path, action);
		this.routes.push(route);
		return route;
	}

	match(method: string, pathname: string): Route | null {
		for (const route of this.routes) {
			const regex = new RegExp(
				`^${route.path.replace(/:([^/]+)/g, '([^/]+)')}$`,
			);
			const match = pathname.match(regex);

			if (match && route.method === method) {
				route.params = match.slice(1);
				return route;
			}
		}

		return null;
	}

	protected async dispatch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const route = this.match(request.method, url.pathname);

		if (!route) {
				return new Response('Not Found', { status: 404 });
		}

		const action = route.action;

		if (typeof action === 'function') {
			if (action.prototype && typeof action.prototype.invoke === 'function') {
				// @ts-expect-error
				return new action().invoke(request);
			}

			// @ts-expect-error
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
