import type { Application } from "@core/Foundation/Application";
import type { MiddlewareIdentifier } from "@core/Foundation/Http/Middleware";
import type { HttpRequest } from "@core/Http/Request";
import type { ResourceOptions } from "@core/Routing/ResourceRegistrar";
import type {
	ControllerAction,
	ControllerConstructor,
	RouteGroupAttributes,
} from "@core/Routing/Route";
import { Router } from "@core/Routing/Router";

declare global {
	// eslint-disable-next-line no-var
	var __lantern_app: Application | undefined;
}

const router = (): Router => {
	const app = globalThis.__lantern_app;
	if (!app) {
		throw new Error("Lantern application has not been bootstrapped.");
	}

	return app.make(Router);
};

class RouteFacade {
	get(uri: string, action: ControllerAction) {
		return router().get(uri, action);
	}

	post(uri: string, action: ControllerAction) {
		return router().post(uri, action);
	}

	put(uri: string, action: ControllerAction) {
		return router().put(uri, action);
	}

	patch(uri: string, action: ControllerAction) {
		return router().patch(uri, action);
	}

	delete(uri: string, action: ControllerAction) {
		return router().delete(uri, action);
	}

	options(uri: string, action: ControllerAction) {
		return router().options(uri, action);
	}

	match(methods: string[], uri: string, action: ControllerAction) {
		return router().match(methods, uri, action);
	}

	any(uri: string, action: ControllerAction) {
		return router().any(uri, action);
	}

	redirect(from: string, to: string, status = 302) {
		return router().redirect(from, to, status);
	}

	view(uri: string, view: string, data?: Record<string, unknown>) {
		return router().view(uri, view, data);
	}

	fallback(action: ControllerAction) {
		return router().fallback(action);
	}

	group(attributes: RouteGroupAttributes, callback: () => void) {
		return router().group(attributes, callback);
	}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]) {
		return router().middleware(middleware);
	}

	namespace(namespace: string) {
		return router().namespace(namespace);
	}

	prefix(prefix: string) {
		return router().prefix(prefix);
	}

	name(name: string) {
		return router().name(name);
	}

	controller(controller: ControllerConstructor) {
		return router().controller(controller);
	}

	resource(
		name: string,
		controller: ControllerConstructor,
		options?: ResourceOptions,
	) {
		return router().resource(name, controller, options);
	}

	resources(routes: Record<string, ControllerConstructor>) {
		return router().resources(routes);
	}

	apiResource(
		name: string,
		controller: ControllerConstructor,
		options?: ResourceOptions,
	) {
		return router().apiResource(name, controller, options);
	}

	apiResources(routes: Record<string, ControllerConstructor>) {
		return router().apiResources(routes);
	}

	bind(
		key: string,
		resolver: (value: string, request: HttpRequest) => unknown,
	) {
		return router().bind(key, resolver);
	}

	model(
		key: string,
		model: ControllerConstructor & { findOrFail?: (value: string) => any },
	) {
		return router().model(key, model);
	}

	pattern(parameter: string, pattern: string | RegExp) {
		return router().pattern(parameter, pattern);
	}

	patterns(definitions: Record<string, string | RegExp>) {
		return router().patterns(definitions);
	}

	routesByName() {
		return router().routesByName();
	}

	has(name: string) {
		return router().has(name);
	}

	currentRouteName() {
		return router().currentRouteName();
	}

	currentRouteAction() {
		return router().currentRouteAction();
	}

	matchedRoute() {
		return router().matchedRoute();
	}

	toUrl(
		name: string,
		parameters?: Record<string, unknown>,
		absolute?: boolean,
	) {
		return router().toUrl(name, parameters, absolute);
	}

	cacheRoutes(cachePath: string) {
		return router().cacheRoutes(cachePath);
	}

	loadCachedRoutes(cachePath: string) {
		return router().loadCachedRoutes(cachePath);
	}
}

export const Route = new RouteFacade();
