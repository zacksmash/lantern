import { Route, type RouteAction } from '@core/Routing/Route';

export class Router {
	public routes: Route[] = [];

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
		return route; // enable chaining like .name().middleware()
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
}
