import type { Route } from "./Route";

export class RouteCollection {
	private readonly routes: Route[] = [];

	add(route: Route): Route {
		this.routes.push(route);
		return route;
	}

	all(): Route[] {
		return this.routes;
	}
}
