export type RouteAction =
	| ((req: Request) => Response | Promise<Response>)
	| (new () => any)
	| [new () => any, string];

export class Route {
	routeName: string | null = null;
	routeMiddleware: any[] = [];
	params: string[] = [];

	constructor(
		public method: string,
		public path: string,
		public action: RouteAction,
	) {}

	name(name: string) {
		this.routeName = name;
		return this;
	}

	middleware(list: any[]) {
		this.routeMiddleware = list;
		return this;
	}
}
