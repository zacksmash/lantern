import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Application } from "@core/Foundation/Application";
import type { RoutingConfiguration } from "@core/Foundation/Configuration/Routing";
import type {
	MiddlewareIdentifier,
	MiddlewareSnapshot,
} from "@core/Foundation/Http/Middleware";
import { MiddlewarePipeline } from "@core/Foundation/Http/Middleware/Pipeline";
import type { HttpRequest } from "@core/Http/Request";
import { HttpResponse } from "@core/Http/Response";
import {
	ResponseFactory,
	type ResponseValue,
} from "@core/Http/ResponseFactory";
import { ModelNotFoundHttpException } from "./Exceptions/ModelNotFoundHttpException";
import { type ResourceOptions, ResourceRegistrar } from "./ResourceRegistrar";
import type {
	ControllerAction,
	ControllerConstructor,
	RouteGroupAttributes,
} from "./Route";
import { Route } from "./Route";
import { RouteCache, type RouteCachePayload } from "./RouteCache";
import { RouteCollection } from "./RouteCollection";
import { RouteRegistrar } from "./RouteRegistrar";

type RouteDefinitionCallback = () => void | Promise<void>;
type ParameterBinder = (
	value: string,
	request: HttpRequest,
) => Promise<unknown> | unknown;
type PatternValue = string | RegExp;

const UNIVERSAL_METHODS = [
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"OPTIONS",
];
const FALLBACK_CATCHALL = "__fallback_path";

export class Router {
	private readonly routes = new RouteCollection();
	private readonly groupStack: RouteGroupAttributes[] = [];
	private readonly resourceRegistrar = new ResourceRegistrar(this);
	private bindings: Map<string, ParameterBinder> = new Map();
	private manifest: RoutingConfiguration | null = null;
	private middlewareSnapshot: MiddlewareSnapshot | null = null;
	private routesLoaded = false;
	private basePath: string;
	private fallbackRoute?: Route;
	private readonly parameterPatterns: Record<string, PatternValue> = {};
	private currentRoute?: Route;

	constructor(private readonly app: Application) {
		this.basePath = app.getBasePath();
	}

	getRoutes() {
		return this.routes.all();
	}

	getBasePath(): string {
		return this.basePath;
	}

	get(uri: string, action: ControllerAction): Route {
		return this.addRoute(["GET", "HEAD"], uri, action);
	}

	post(uri: string, action: ControllerAction): Route {
		return this.addRoute(["POST"], uri, action);
	}

	put(uri: string, action: ControllerAction): Route {
		return this.addRoute(["PUT"], uri, action);
	}

	patch(uri: string, action: ControllerAction): Route {
		return this.addRoute(["PATCH"], uri, action);
	}

	delete(uri: string, action: ControllerAction): Route {
		return this.addRoute(["DELETE"], uri, action);
	}

	options(uri: string, action: ControllerAction): Route {
		return this.addRoute(["OPTIONS"], uri, action);
	}

	match(methods: string[], uri: string, action: ControllerAction): Route {
		return this.addRoute(
			methods.map((method) => method.toUpperCase()),
			uri,
			action,
		);
	}

	any(uri: string, action: ControllerAction): Route {
		return this.addRoute([...UNIVERSAL_METHODS], uri, action);
	}

	redirect(from: string, to: string, status = 302): Route {
		return this.any(from, () => HttpResponse.redirect(to, status));
	}

	view(uri: string, view: string, data: Record<string, unknown> = {}): Route {
		return this.get(uri, () => ({
			component: view,
			props: data,
		}));
	}

	fallback(action: ControllerAction): Route {
		const route = this.addRoute(
			[...UNIVERSAL_METHODS],
			`{${FALLBACK_CATCHALL}?}`,
			action,
		);
		route.where(FALLBACK_CATCHALL, ".*").fallback();
		this.fallbackRoute = route;
		return route;
	}

	pattern(parameter: string, pattern: PatternValue): void {
		this.parameterPatterns[parameter] = pattern;
	}

	patterns(definitions: Record<string, PatternValue>): void {
		for (const [parameter, pattern] of Object.entries(definitions)) {
			this.pattern(parameter, pattern);
		}
	}

	routesByName(): Map<string, Route> {
		return this.routes.byName();
	}

	has(name: string): boolean {
		return this.routesByName().has(name);
	}

	currentRouteName(): string | undefined {
		return this.currentRoute?.getName();
	}

	currentRouteAction(): ControllerAction | undefined {
		return this.currentRoute?.getAction();
	}

	matchedRoute(): Route | undefined {
		return this.currentRoute;
	}

	cacheRoutes(cachePath: string): void {
		const cache = new RouteCache(cachePath);
		cache.write(this.routes.all());
	}

	loadCachedRoutes(cachePath: string): RouteCachePayload | null {
		const cache = new RouteCache(cachePath);
		const payload = cache.read();
		if (!payload) {
			return null;
		}

		return payload;
	}

	toUrl(
		name: string,
		parameters: Record<string, unknown> = {},
		absolute = true,
	) {
		const route = this.routesByName().get(name);
		if (!route) {
			throw new Error(`Route [${name}] is not defined.`);
		}

		const { params, query, fragment, origin } =
			this.normalizeUrlOptions(parameters);
		const path = route.toPath(params);
		if (!absolute) {
			return this.appendUrlParts(path, query, fragment);
		}

		const base = origin ?? "http://localhost";

		return `${base}${this.appendUrlParts(path, query, fragment)}`;
	}

	resource(
		name: string,
		controller: ControllerConstructor,
		options?: ResourceOptions,
	): void {
		this.resourceRegistrar.register(name, controller, options);
	}

	resources(definitions: Record<string, ControllerConstructor>): void {
		for (const [name, controller] of Object.entries(definitions)) {
			this.resource(name, controller);
		}
	}

	apiResource(
		name: string,
		controller: ControllerConstructor,
		options?: ResourceOptions,
	): void {
		this.resourceRegistrar.register(name, controller, options, true);
	}

	apiResources(definitions: Record<string, ControllerConstructor>): void {
		for (const [name, controller] of Object.entries(definitions)) {
			this.apiResource(name, controller);
		}
	}

	group(
		attributes: RouteGroupAttributes,
		callback: RouteDefinitionCallback,
	): void | Promise<void> {
		this.groupStack.push(attributes);
		const result = callback();
		if (result instanceof Promise) {
			return result.finally(() => {
				this.groupStack.pop();
			});
		}

		this.groupStack.pop();
		return result;
	}

	middleware(
		middleware: MiddlewareIdentifier | MiddlewareIdentifier[],
	): RouteRegistrar {
		const registrar = new RouteRegistrar(this);
		registrar.middleware(middleware);
		return registrar;
	}

	namespace(namespace: string): RouteRegistrar {
		const registrar = new RouteRegistrar(this);
		registrar.namespace(namespace);
		return registrar;
	}

	prefix(prefix: string): RouteRegistrar {
		const registrar = new RouteRegistrar(this);
		registrar.prefix(prefix);
		return registrar;
	}

	name(name: string): RouteRegistrar {
		const registrar = new RouteRegistrar(this);
		registrar.name(name);
		return registrar;
	}

	controller(controller: ControllerConstructor): RouteRegistrar {
		const registrar = new RouteRegistrar(this);
		registrar.controller(controller);
		return registrar;
	}

	bind(
		key: string,
		resolver: (value: string, request: HttpRequest) => any,
	): void {
		this.bindings.set(key, resolver);
	}

	model(
		key: string,
		model: ControllerConstructor & { findOrFail?: (value: string) => any },
	): void {
		this.bind(key, async (value: string) => {
			const resolve = async (
				target: ControllerConstructor & {
					findOrFail?: (input: string) => any | Promise<any>;
				},
			) => {
				if (typeof target.findOrFail !== "function") {
					return value;
				}

				try {
					return await target.findOrFail(value);
				} catch (error) {
					throw new ModelNotFoundHttpException(key, value, error);
				}
			};

			if (typeof model.findOrFail === "function") {
				return resolve(model);
			}

			const instance = this.app.make(model) as {
				findOrFail?: (input: string) => any | Promise<any>;
			};
			if (typeof instance.findOrFail === "function") {
				return resolve(instance as any);
			}

			return value;
		});
	}

	async dispatch(request: HttpRequest): Promise<ResponseValue> {
		await this.ensureRoutesAreLoaded();

		const route = this.findRoute(request);
		if (!route) {
			return this.handleMissingRoute(request);
		}

		return this.runRoute(route, request);
	}

	private async runRoute(
		route: Route,
		request: HttpRequest,
	): Promise<ResponseValue> {
		const parameters: Record<string, unknown> = {
			...route.extractParameters(request.path()),
		};
		try {
			await this.substituteBindings(request, parameters);
		} catch (error) {
			if (error instanceof ModelNotFoundHttpException) {
				return this.runThroughPipeline(route, request, (req) =>
					this.handleBindingFailure(route, req, error),
				);
			}

			throw error;
		}

		request.setRouteParameters(parameters);

		return this.runThroughPipeline(route, request, (req) => route.run(req));
	}

	private async runThroughPipeline(
		route: Route,
		request: HttpRequest,
		destination: (request: HttpRequest) => Promise<ResponseValue>,
	): Promise<ResponseValue> {
		const snapshot = this.middlewareSnapshot;
		if (!snapshot) {
			throw new Error("Middleware snapshot not available.");
		}

		const pipeline = new MiddlewarePipeline(
			(token) => this.app.make(token),
			snapshot.aliases,
		);
		const stack = [...snapshot.global, ...route.getMiddleware()];
		this.currentRoute = route;

		try {
			return await pipeline.handle(stack, request, destination);
		} finally {
			this.currentRoute = undefined;
		}
	}

	private async handleMissingRoute(
		request: HttpRequest,
	): Promise<ResponseValue> {
		if (this.fallbackRoute) {
			return this.runRoute(this.fallbackRoute, request);
		}

		return ResponseFactory.prepare("Not Found", { status: 404 });
	}

	private async handleBindingFailure(
		route: Route,
		request: HttpRequest,
		error: ModelNotFoundHttpException,
	): Promise<ResponseValue> {
		const handler = route.getMissingHandler();
		if (handler) {
			return handler(request);
		}

		return ResponseFactory.prepare("Not Found", {
			status: 404,
			statusText: error.message,
		});
	}

	bindRoutes(configuration: RoutingConfiguration): void {
		this.manifest = configuration;
	}

	setMiddlewareSnapshot(snapshot: MiddlewareSnapshot): void {
		this.middlewareSnapshot = snapshot;
	}

	public addRoute(
		methods: string[],
		uri: string,
		action: ControllerAction,
	): Route {
		const route = new Route(
			methods.map((method) => method.toUpperCase()),
			uri,
			action,
			this.app,
			[...this.groupStack],
			{ ...this.parameterPatterns },
		);

		this.routes.add(route);
		return route;
	}

	private findRoute(request: HttpRequest): Route | undefined {
		const method = request.method.toUpperCase();
		const path = request.path();

		for (const route of this.routes.all()) {
			if (route.isFallback()) {
				continue;
			}

			if (route.matches(method, path)) {
				return route;
			}
		}

		return undefined;
	}

	private async substituteBindings(
		request: HttpRequest,
		parameters: Record<string, unknown>,
	): Promise<void> {
		for (const [key, value] of Object.entries(parameters)) {
			const binder = this.bindings.get(key);
			if (!binder) {
				continue;
			}

			const resolved = await binder(String(value), request);
			if (typeof resolved === "undefined" || resolved === null) {
				throw new ModelNotFoundHttpException(key, String(value));
			}

			parameters[key] = resolved;
		}
	}

	private async ensureRoutesAreLoaded(): Promise<void> {
		if (this.routesLoaded) {
			return;
		}

		await this.loadRoutes();
		this.routesLoaded = true;
	}

	private normalizeUrlOptions(parameters: Record<string, unknown>): {
		params: Record<string, unknown>;
		query?: Record<string, unknown>;
		fragment?: string;
		origin?: string;
	} {
		const { query, fragment, __origin, ...rest } = parameters as {
			query?: Record<string, unknown>;
			fragment?: string;
			__origin?: string;
			[key: string]: unknown;
		};

		return {
			params: rest,
			query,
			fragment,
			origin: __origin,
		};
	}

	private appendUrlParts(
		path: string,
		query?: Record<string, unknown>,
		fragment?: string,
	): string {
		let full = path;
		if (query && Object.keys(query).length) {
			const qs = new URLSearchParams();
			for (const [key, value] of Object.entries(query)) {
				if (typeof value === "undefined" || value === null) continue;
				qs.append(key, String(value));
			}
			const queryString = qs.toString();
			if (queryString) {
				full += `?${queryString}`;
			}
		}

		if (fragment) {
			full += `#${fragment.replace(/^#/, "")}`;
		}

		return full;
	}

	private async loadRoutes(): Promise<void> {
		if (!this.manifest) {
			return;
		}

		const snapshot = this.middlewareSnapshot;
		if (!snapshot) {
			throw new Error("Middleware snapshot missing for route loading.");
		}

		if (this.manifest.web) {
			await this.loadRouteEntries(this.manifest.web, {
				middleware: snapshot.groups.web,
			});
		}

		if (this.manifest.api) {
			const prefix = this.manifest.apiPrefix ?? "/api";
			await this.loadRouteEntries(this.manifest.api, {
				prefix,
				name: "api.",
				middleware: snapshot.groups.api,
			});
		}
	}

	private async loadRouteEntries(
		entries: string | string[],
		attributes: RouteGroupAttributes = {},
	): Promise<void> {
		const files = Array.isArray(entries) ? entries : [entries];

		for (const file of files) {
			if (!file) continue;
			const resolved = path.isAbsolute(file)
				? file
				: path.resolve(this.basePath, file);

			if (!existsSync(resolved)) {
				continue;
			}

			const callback = async () => {
				await import(pathToFileURL(resolved).href);
			};

			const result = this.group(attributes, callback);
			if (result instanceof Promise) {
				await result;
			}
		}
	}
}
