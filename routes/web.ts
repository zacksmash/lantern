import type { LanternRequest } from "@core/Http/Request";

type RouteHandler = (request: LanternRequest) => Response | Promise<Response>;

const routes: Record<string, RouteHandler> = {
	"/": () => new Response("Welcome to the Lantern Web"),
};

export default routes;
