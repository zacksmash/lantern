import type { Application } from "@core/Foundation/Application";
import type { MiddlewareIdentifier } from "@core/Foundation/Http/Middleware";
import type { HttpRequest } from "@core/Http/Request";
import type { ResponseValue } from "@core/Http/ResponseFactory";

export type ControllerConstructor<T = unknown> = new (...args: any[]) => T;
export type RouteCallable = (
	request: HttpRequest,
) => ResponseValue | Promise<ResponseValue>;
export type ControllerAction =
	| ControllerConstructor
	| [ControllerConstructor, string]
	| RouteCallable
	| string;

interface CompiledRoute {
	regex: RegExp;
	keys: string[];
}

export interface RouteGroupAttributes {
	prefix?: string;
	name?: string;
	namespace?: string;
	middleware?: MiddlewareIdentifier | MiddlewareIdentifier[];
	controller?: ControllerConstructor;
}

export class Route {
	private nameValue?: string;
	private namePrefix = "";
	private action: ControllerAction;
	private middlewareStack: MiddlewareIdentifier[] = [];
	private compiled?: CompiledRoute;
	private parameterNames: string[] = [];
	private compiledPath: string;

	constructor(
		private readonly methods: string[],
		private uri: string,
		action: ControllerAction,
		private readonly app: Application,
		private readonly groupStack: RouteGroupAttributes[],
	) {
		this.action = action;
		this.uri = this.normalizeUri(uri);
		this.compiledPath = this.uri;
		this.compileRoute();
		this.applyGroupAttributes();
	}

	getUri(): string {
		return this.uri;
	}

	getName(): string | undefined {
		return this.nameValue;
	}

	getMethods(): string[] {
		return this.methods;
	}

	name(name: string): this {
		this.nameValue = `${this.namePrefix}${name}`;
		return this;
	}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]): this {
		if (Array.isArray(middleware)) {
			this.middlewareStack.push(...middleware);
		} else {
			this.middlewareStack.push(middleware);
		}

		return this;
	}

	getMiddleware(): MiddlewareIdentifier[] {
		return this.middlewareStack;
	}

	matches(method: string, path: string): boolean {
		if (
			!this.methods.includes(method.toUpperCase()) &&
			!this.methods.includes("ANY")
		) {
			return false;
		}

		if (!this.compiled) {
			this.compileRoute();
		}

		return Boolean(this.compiled?.regex.test(path));
	}

	extractParameters(path: string): Record<string, string> {
		if (!this.compiled) {
			this.compileRoute();
		}

		const matches = this.compiled?.regex.exec(path);
		if (!matches) {
			return {};
		}

		const params: Record<string, string> = {};
		for (let i = 0; i < this.parameterNames.length; i++) {
			params[this.parameterNames[i]!] = matches[i + 1] ?? "";
		}

		return params;
	}

	async run(request: HttpRequest): Promise<ResponseValue> {
		const action = this.resolveAction();

		return action(request);
	}

	protected resolveAction(): RouteCallable {
		const action = this.action;

		if (typeof action === "function" && !(action as any).prototype) {
			return action as RouteCallable;
		}

		if (typeof action === "string") {
			const controller = this.resolveGroupController();
			if (!controller) {
				throw new Error(
					`Route action "${action}" requires a controller context.`,
				);
			}

			return this.createControllerInvoker(controller, action);
		}

		if (Array.isArray(action)) {
			const [controller, method] = action;
			return this.createControllerInvoker(controller, method);
		}

		if (typeof action === "function") {
			return this.createControllerInvoker(
				action as ControllerConstructor,
				"invoke",
			);
		}

		throw new Error("Unable to resolve route action.");
	}

	private createControllerInvoker(
		controller: ControllerConstructor,
		method: string,
	): RouteCallable {
		return async (request: HttpRequest) => {
			const instance = this.app.make(controller);
			const handler =
				(instance as any)[method] ?? (instance as any)[this.capitalize(method)];

			if (typeof handler !== "function") {
				throw new Error(
					`Controller method "${method}" is not defined on ${controller.name}.`,
				);
			}

			return handler.call(instance, request);
		};
	}

	private capitalize(value: string): string {
		return value.charAt(0).toLowerCase() + value.slice(1);
	}

	private applyGroupAttributes(): void {
		for (const group of this.groupStack) {
			if (group.prefix) {
				this.uri = this.joinUri(group.prefix, this.uri);
			}

			if (group.middleware) {
				this.middleware(group.middleware);
			}

			if (group.name) {
				this.namePrefix = `${group.name}${this.namePrefix}`;
			}

			if (group.namespace) {
				this.action = this.prefixNamespace(group.namespace, this.action);
			}

			if (
				typeof group.controller !== "undefined" &&
				typeof this.action === "string"
			) {
				this.action = [group.controller, this.action];
			}
		}

		this.compiledPath = this.normalizeUri(this.uri);
		this.compileRoute();
	}

	private prefixNamespace(
		namespace: string,
		action: ControllerAction,
	): ControllerAction {
		if (typeof action === "string") {
			return `${namespace}.${action}`;
		}

		return action;
	}

	private resolveGroupController(): ControllerConstructor | undefined {
		for (let i = this.groupStack.length - 1; i >= 0; i--) {
			const controller = this.groupStack[i]?.controller;
			if (controller) {
				return controller;
			}
		}

		return undefined;
	}

	private normalizeUri(uri: string): string {
		return `/${uri}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
	}

	private compileRoute(): void {
		const parameterPattern = /{([^}?]+)(\?)?}/g;
		const keys: string[] = [];
		let pattern = this.compiledPath;

		pattern = pattern.replace(
			parameterPattern,
			(_, key: string, optional: string) => {
				keys.push(key);
				const segment = "([^/]+)";

				return optional ? `${segment}?` : segment;
			},
		);

		const normalized =
			pattern.length > 1 ? pattern.replace(/\/+$/, "") : pattern;

		this.compiled = {
			regex: new RegExp(`^${normalized}$`),
			keys,
		};
		this.parameterNames = keys;
	}

	private joinUri(prefix: string, uri: string): string {
		const normalizedPrefix = this.normalizeUri(prefix);
		const normalizedUri = this.normalizeUri(uri);

		if (normalizedPrefix === "/") {
			return normalizedUri;
		}

		if (normalizedUri === "/") {
			return normalizedPrefix;
		}

		return `${normalizedPrefix}/${normalizedUri}`.replace(/\/+/g, "/");
	}
}
