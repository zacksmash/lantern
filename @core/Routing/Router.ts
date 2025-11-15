import type { Container } from "@core/Container";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";
import {
	type ControllerConstructor,
	type MiddlewareConstructor,
	type MiddlewareIdentifier,
	Route,
	type RouteAction,
	type RouteCallable,
} from "@core/Routing/Route";
import type { RouteManifest } from "@core/Routing/RouteManifest";

export interface RouteGroupOptions {
	prefix?: string;
	middleware?: MiddlewareIdentifier | MiddlewareIdentifier[];
	name?: string;
	where?: Record<string, string | RegExp>;
	controller?: ControllerConstructor;
}

export interface RouteMatch {
	route: Route;
	params: Record<string, string>;
}

export class Router {
	routes: Route[] = [];
	private routesByMethod = new Map<string, Route[]>();
	private namedRoutes = new Map<string, Route>();
	private groupStack: RouteGroupOptions[] = [{}];
	private middlewareAliases = new Map<string, MiddlewareConstructor>();
	private cachedManifest: RouteManifest | null = null;

	constructor(private container?: Container) {}

	get(path: string, action: RouteAction) {
		return this.addRoute(["GET"], path, action);
	}

	post(path: string, action: RouteAction) {
		return this.addRoute(["POST"], path, action);
	}

	put(path: string, action: RouteAction) {
		return this.addRoute(["PUT"], path, action);
	}

	patch(path: string, action: RouteAction) {
		return this.addRoute(["PATCH"], path, action);
	}

	delete(path: string, action: RouteAction) {
		return this.addRoute(["DELETE"], path, action);
	}

	options(path: string, action: RouteAction) {
		return this.addRoute(["OPTIONS"], path, action);
	}

	head(path: string, action: RouteAction) {
		return this.addRoute(["HEAD"], path, action);
	}

	match(methods: string[], path: string, action: RouteAction) {
		return this.addRoute(
			methods.map((m) => m.toUpperCase()),
			path,
			action,
		);
	}

	any(path: string, action: RouteAction) {
		return this.addRoute(
			["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
			path,
			action,
		);
	}

	resource(name: string, controller: ControllerConstructor) {
		const basePath = normalizeResourceUri(name);
		const parameter = normalizeResourceParameter(name);

		return {
			index: this.get(basePath, [controller, "index"]).name(`${name}.index`),
			create: this.get(`${basePath}/create`, [controller, "create"]).name(
				`${name}.create`,
			),
			store: this.post(basePath, [controller, "store"]).name(`${name}.store`),
			show: this.get(`${basePath}/{${parameter}}`, [controller, "show"]).name(
				`${name}.show`,
			),
			edit: this.get(`${basePath}/{${parameter}}/edit`, [
				controller,
				"edit",
			]).name(`${name}.edit`),
			update: this.match(["PUT", "PATCH"], `${basePath}/{${parameter}}`, [
				controller,
				"update",
			]).name(`${name}.update`),
			destroy: this.delete(`${basePath}/{${parameter}}`, [
				controller,
				"destroy",
			]).name(`${name}.destroy`),
		};
	}

	group(attributes: RouteGroupOptions, callback: () => void) {
		const merged = this.mergeGroup(attributes);
		this.groupStack.push(merged);
		callback();
		this.groupStack.pop();
	}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]) {
		return new RouteRegistrar(this).middleware(middleware);
	}

	prefix(prefix: string) {
		return new RouteRegistrar(this).prefix(prefix);
	}

	name(name: string) {
		return new RouteRegistrar(this).name(name);
	}

	controller(controller: ControllerConstructor) {
		return new RouteRegistrar(this).controller(controller);
	}

	where(constraints: Record<string, string | RegExp>) {
		return new RouteRegistrar(this).where(constraints);
	}

	aliasMiddleware(alias: string, middleware: MiddlewareConstructor) {
		this.middlewareAliases.set(alias, middleware);
	}

	matchRoute(request: HttpRequest): RouteMatch | null {
		const existing = request.getRouteMatch();
		if (existing) return existing;

		const method = request.method;
		const path = request.path();
		const candidates = this.routesByMethod.get(method) ?? [];

		for (const route of candidates) {
			const params = route.matches(path, method);
			if (params) {
				const match = { route, params };
				request.assignRouteMatch(match);
				return match;
			}
		}

		request.assignRouteMatch(null);

		return null;
	}

	instantiateMiddleware(identifier: MiddlewareIdentifier): Middleware {
		if (typeof identifier === "string") {
			const middleware = this.middlewareAliases.get(identifier);
			if (!middleware) {
				throw new Error(
					`Route middleware alias "${identifier}" is not registered.`,
				);
			}
			return this.instantiate(middleware);
		}

		return this.instantiate(identifier);
	}

	async dispatch(request: HttpRequest): Promise<Response> {
		const match = request.getRouteMatch() ?? this.matchRoute(request);
		return this.runRoute(match, request);
	}

	protected addRoute(methods: string[], path: string, action: RouteAction) {
		const route = new Route(
			methods,
			normalizeUri(path),
			action,
			(routeInstance, newName, previousName) =>
				this.handleRouteNameChange(routeInstance, newName, previousName),
		);
		this.applyGroupAttributes(route);
		this.routes.push(route);

		for (const method of methods) {
			const upperMethod = method.toUpperCase();
			const collection = this.routesByMethod.get(upperMethod);
			if (collection) {
				collection.push(route);
			} else {
				this.routesByMethod.set(upperMethod, [route]);
			}
		}

		return route;
	}

	protected runRoute(match: RouteMatch | null, request: HttpRequest) {
		if (!match) {
			return new Response("Not Found", { status: 404 });
		}

		const { route } = match;
		const action = route.action;

		if (isControllerConstructor(action)) {
			const Controller = action;
			const instance = this.instantiate(Controller);
			return instance.invoke(request);
		}

		if (typeof action === "function") {
			const callable = action as RouteCallable;
			return callable(request);
		}

		if (Array.isArray(action)) {
			const [Controller, method] = action;
			const instance = this.instantiate(Controller);
			const handler = instance[method];

			if (typeof handler !== "function") {
				throw new Error(
					`Controller ${Controller.name} does not have method ${method}.`,
				);
			}

			return handler.call(instance, request);
		}

		throw new Error("Invalid route action.");
	}

	getRouteByName(name: string): Route | undefined {
		return this.namedRoutes.get(name);
	}

	getUriByName(name: string): string | null {
		const route = this.namedRoutes.get(name);
		if (route) return route.uri;
		if (this.cachedManifest?.[name]) {
			return this.cachedManifest[name].uri;
		}
		return null;
	}

	getRouteManifest(): RouteManifest {
		const manifest: RouteManifest = {};
		for (const [name, route] of this.namedRoutes.entries()) {
			manifest[name] = {
				uri: route.uri,
				methods: route.methods,
			};
		}
		return manifest;
	}

	loadRouteManifest(manifest: RouteManifest) {
		this.cachedManifest = manifest;
	}

	private handleRouteNameChange(
		route: Route,
		newName: string | null,
		previousName: string | null,
	) {
		if (previousName) {
			this.namedRoutes.delete(previousName);
		}

		if (newName) {
			this.namedRoutes.set(newName, route);
		}
	}

	private instantiate<T>(ctor: Constructor<T>): T {
		if (this.container) {
			return this.container.resolve(ctor);
		}

		return new ctor();
	}

	private applyGroupAttributes(route: Route) {
		const group = this.groupStack[this.groupStack.length - 1];
		if (!group) return;

		if (group.prefix) {
			route.prependPrefix(group.prefix);
		}

		if (group.middleware) {
			const groupMiddleware = Array.isArray(group.middleware)
				? group.middleware
				: [group.middleware];
			route.prependMiddleware(groupMiddleware);
		}

		if (group.name) {
			route.setNamePrefix(group.name);
		}

		if (group.where) {
			const regexConstraints: Record<string, RegExp> = {};
			for (const [key, value] of Object.entries(group.where)) {
				regexConstraints[key] =
					typeof value === "string" ? new RegExp(value) : value;
			}

			route.mergeWhere(regexConstraints);
		}

		if (group.controller && typeof route.action === "string") {
			route.action = [group.controller, route.action];
		}
	}

	private mergeGroup(attributes: RouteGroupOptions): RouteGroupOptions {
		const parent = this.groupStack[this.groupStack.length - 1] ?? {};

		return {
			prefix: joinPrefixes(parent.prefix, attributes.prefix),
			middleware: mergeMiddleware(parent.middleware, attributes.middleware),
			name: `${parent.name ?? ""}${attributes.name ?? ""}`,
			where: { ...(parent.where ?? {}), ...(attributes.where ?? {}) },
			controller: attributes.controller ?? parent.controller,
		};
	}
}

class RouteRegistrar {
	constructor(
		private router: Router,
		private attributes: RouteGroupOptions = {},
	) {}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]) {
		if (this.attributes.middleware) {
			const existing = Array.isArray(this.attributes.middleware)
				? this.attributes.middleware
				: [this.attributes.middleware];
			const merged = Array.isArray(middleware) ? middleware : [middleware];
			this.attributes.middleware = existing.concat(merged);
		} else {
			this.attributes.middleware = middleware;
		}

		return this;
	}

	prefix(prefix: string) {
		this.attributes.prefix = joinPrefixes(this.attributes.prefix, prefix);
		return this;
	}

	name(name: string) {
		this.attributes.name = `${this.attributes.name ?? ""}${name}`;
		return this;
	}

	controller(controller: ControllerConstructor) {
		this.attributes.controller = controller;
		return this;
	}

	where(constraints: Record<string, string | RegExp>) {
		this.attributes.where = {
			...(this.attributes.where ?? {}),
			...constraints,
		};
		return this;
	}

	group(callback: () => void) {
		this.router.group(this.attributes, callback);
	}
}

const normalizeUri = (uri: string) => {
	if (!uri) return "/";
	if (!uri.startsWith("/")) uri = `/${uri}`;
	uri = uri.replace(/\/{2,}/g, "/");
	if (uri !== "/" && uri.endsWith("/")) {
		return uri.replace(/\/+$/, "");
	}
	return uri;
};

const normalizeResourceUri = (name: string) => normalizeUri(`/${name}`);

const normalizeResourceParameter = (name: string) => {
	const segments = name.split(".");
	const segment = segments[segments.length - 1] ?? name;
	return segment.replace(/[^a-zA-Z0-9]/g, "_");
};

const joinPrefixes = (parent?: string, child?: string) => {
	const segments = [parent, child].filter(Boolean) as string[];
	if (segments.length === 0) return undefined;
	return normalizeUri(segments.join("/"));
};

const mergeMiddleware = (
	parent?: MiddlewareIdentifier | MiddlewareIdentifier[],
	child?: MiddlewareIdentifier | MiddlewareIdentifier[],
) => {
	const toArray = (value?: MiddlewareIdentifier | MiddlewareIdentifier[]) => {
		if (!value) return [];
		return Array.isArray(value) ? value : [value];
	};

	const merged = [...toArray(parent), ...toArray(child)];
	return merged.length ? merged : undefined;
};

type Constructor<T = any> = new (...args: any[]) => T;

const isControllerConstructor = (
	action: RouteAction,
): action is ControllerConstructor => {
	return (
		typeof action === "function" &&
		typeof (action as ControllerConstructor).prototype?.invoke === "function"
	);
};
