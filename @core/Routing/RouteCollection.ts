import type { Route } from "./Route";

export class RouteCollection {
	private readonly routes: Route[] = [];
	private fallbackRoute?: Route;

	add(route: Route): Route {
		this.routes.push(route);

		if (route.isFallback()) {
			this.fallbackRoute = route;
		}

		return route;
	}

	all(): Route[] {
		return this.routes;
	}

	byName(): Map<string, Route> {
		const named = new Map<string, Route>();
		for (const route of this.routes) {
			const name = route.getName();
			if (name) {
				named.set(name, route);
			}
		}

		return named;
	}

	fallback(): Route | undefined {
		return this.fallbackRoute;
	}
}
