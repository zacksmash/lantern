export type RouteAction =
	| ((req: Request) => Response | Promise<Response>)
	| [new () => any, string];

export class Route {
	public routeName: string | null = null;
	public routeMiddleware: any[] = [];
	public params: string[] = [];

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
