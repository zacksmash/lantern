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
import {
	ResponseFactory,
	type ResponseValue,
} from "@core/Http/ResponseFactory";
import { type ResourceOptions, ResourceRegistrar } from "./ResourceRegistrar";
import type {
	ControllerAction,
	ControllerConstructor,
	RouteGroupAttributes,
} from "./Route";
import { Route } from "./Route";
import { RouteCollection } from "./RouteCollection";
import { RouteRegistrar } from "./RouteRegistrar";

type RouteDefinitionCallback = () => void | Promise<void>;

export class Router {
	private readonly routes = new RouteCollection();
	private readonly groupStack: RouteGroupAttributes[] = [];
	private readonly resourceRegistrar = new ResourceRegistrar(this);
	private bindings: Map<string, (value: string, request: HttpRequest) => any> =
		new Map();
	private manifest: RoutingConfiguration | null = null;
	private middlewareSnapshot: MiddlewareSnapshot | null = null;
	private routesLoaded = false;
	private basePath: string;

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
		return this.addRoute(
			["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			uri,
			action,
		);
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
			if (typeof model.findOrFail === "function") {
				return model.findOrFail(value);
			}

			const instance = this.app.make(model);
			if (typeof (instance as any).findOrFail === "function") {
				return (instance as any).findOrFail(value);
			}

			return value;
		});
	}

	async dispatch(request: HttpRequest): Promise<ResponseValue> {
		await this.ensureRoutesAreLoaded();

		const route = this.findRoute(request);
		if (!route) {
			return ResponseFactory.prepare("Not Found", { status: 404 });
		}

		const parameters = route.extractParameters(request.path());
		await this.substituteBindings(request, parameters);

		request.setRouteParameters(parameters);

		const snapshot = this.middlewareSnapshot;
		if (!snapshot) {
			throw new Error("Middleware snapshot not available.");
		}

		const pipeline = new MiddlewarePipeline(
			(token) => this.app.make(token),
			snapshot.aliases,
		);
		const stack = [...snapshot.global, ...route.getMiddleware()];

		return pipeline.handle(stack, request, (req) => route.run(req));
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
		);

		this.routes.add(route);
		return route;
	}

	private findRoute(request: HttpRequest): Route | undefined {
		const method = request.method.toUpperCase();
		const path = request.path();

		for (const route of this.routes.all()) {
			if (route.matches(method, path)) {
				return route;
			}
		}

		return undefined;
	}

	private async substituteBindings(
		request: HttpRequest,
		parameters: Record<string, string>,
	): Promise<void> {
		for (const [key, value] of Object.entries(parameters)) {
			const binder = this.bindings.get(key);
			if (binder) {
				parameters[key] = await binder(value, request);
			}
		}
	}

	private async ensureRoutesAreLoaded(): Promise<void> {
		if (this.routesLoaded) {
			return;
		}

		await this.loadRoutes();
		this.routesLoaded = true;
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
