import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";

export type MiddlewareConstructor = new (...args: any[]) => Middleware;
export type MiddlewareIdentifier = MiddlewareConstructor | string;
export interface ControllerContract {
	invoke(request: HttpRequest): Response | Promise<Response>;
}
export type ControllerConstructor<
	TController extends ControllerContract = ControllerContract,
> = new (
	...args: any[]
) => TController;

export type RouteCallable = (
	request: HttpRequest,
) => Response | Promise<Response>;

export type RouteAction =
	| RouteCallable
	| ControllerConstructor
	| [ControllerConstructor, string]
	| string;

export class Route {
	private middlewareList: MiddlewareIdentifier[] = [];
	public whereClauses: Record<string, RegExp> = {};
	public namePrefix = "";
	private compiledRegex: RegExp | null = null;
	private parameterNames: string[] = [];
	private routeName: string | null = null;

	constructor(
		public methods: string[],
		public uri: string,
		public action: RouteAction,
		private onNameRegistered?: (
			route: Route,
			newName: string | null,
			previousName: string | null,
		) => void,
	) {}

	name(name: string) {
		const previous = this.getName();
		this.routeName = `${this.routeName ?? ""}${name}`;
		this.notifyNameChange(previous);
		return this;
	}

	getName(): string | null {
		if (!this.routeName && !this.namePrefix) return null;
		return `${this.namePrefix}${this.routeName ?? ""}`;
	}

	setNamePrefix(prefix: string) {
		const previous = this.getName();
		this.namePrefix = `${prefix}${this.namePrefix}`;
		this.notifyNameChange(previous);
		return this;
	}

	prependMiddleware(middleware: MiddlewareIdentifier[]) {
		this.middlewareList = middleware.concat(this.middlewareList);
		return this;
	}

	mergeWhere(where: Record<string, RegExp>) {
		this.whereClauses = { ...where, ...this.whereClauses };
		this.compiledRegex = null;
		return this;
	}

	prependPrefix(prefix: string) {
		if (!prefix) return this;
		const previous = this.getName();
		this.uri = normalizeUri(`${prefix}/${this.uri}`.replace(/\/{2,}/g, "/"));
		this.compiledRegex = null;
		this.notifyNameChange(previous);
		return this;
	}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]) {
		const list = Array.isArray(middleware) ? middleware : [middleware];
		this.middlewareList = this.middlewareList.concat(list);
		return this;
	}

	getMiddleware(): MiddlewareIdentifier[] {
		return this.middlewareList;
	}

	where(name: string, expression: string | RegExp): this;
	where(constraints: Record<string, string | RegExp>): this;
	where(
		nameOrConstraints: string | Record<string, string | RegExp>,
		expression?: string | RegExp,
	) {
		if (typeof nameOrConstraints === "string") {
			this.whereClauses[nameOrConstraints] = this.toRegex(expression);
			return this;
		}

		for (const [key, value] of Object.entries(nameOrConstraints)) {
			this.whereClauses[key] = this.toRegex(value);
		}

		return this;
	}

	matches(path: string, method: string): Record<string, string> | null {
		if (!this.methods.includes(method)) return null;

		if (!this.compiledRegex) {
			this.compile();
		}

		const match = this.compiledRegex?.exec(path);
		if (!match) return null;

		const params: Record<string, string> = {};
		this.parameterNames.forEach((name, index) => {
			const value = match[index + 1];
			if (typeof value !== "undefined") {
				params[name] = value;
			}
		});

		return params;
	}

	private compile() {
		if (this.uri === "/") {
			this.compiledRegex = /^\/$/;
			this.parameterNames = [];
			return;
		}

		const segments = this.uri
			.split("/")
			.filter((segment, index) => !(segment === "" && index === 0));

		let pattern = "";
		const parameterNames: string[] = [];

		for (const segment of segments) {
			if (!segment.includes("{")) {
				pattern += `/${escapeRegex(segment)}`;
				continue;
			}

			const match = segment.match(/^\{([^}]+)\}$/);
			if (!match) {
				throw new Error(`Invalid route segment "${segment}".`);
			}

			const [, rawName = ""] = match;
			if (!rawName) {
				throw new Error(`Invalid parameter name in segment "${segment}".`);
			}

			const optional = rawName.endsWith("?");
			const name = optional ? rawName.slice(0, -1) : rawName;

			if (!name) {
				throw new Error(`Invalid parameter name in segment "${segment}".`);
			}

			const constraint = this.whereClauses[name]?.source ?? "[^/]+";

			parameterNames.push(name);

			if (optional) {
				pattern += `(?:/(${constraint}))?`;
			} else {
				pattern += `/(${constraint})`;
			}
		}

		this.parameterNames = parameterNames;
		this.compiledRegex = new RegExp(`^${pattern}\\/?$`);
	}

	private toRegex(expression?: string | RegExp): RegExp {
		if (!expression) {
			return /[^/]+/;
		}

		if (typeof expression === "string") {
			const pattern = expression;
			const match = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
			if (match) {
				const [, body = "", flags = ""] = match;
				return new RegExp(body, flags);
			}

			return new RegExp(pattern);
		}

		return expression;
	}

	private notifyNameChange(previousName: string | null) {
		if (!this.onNameRegistered) return;
		const newName = this.getName();
		this.onNameRegistered(this, newName, previousName);
	}
}

const escapeRegex = (value: string) =>
	value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const normalizeUri = (uri: string) => {
	if (!uri.startsWith("/")) {
		uri = `/${uri}`;
	}

	if (uri !== "/" && uri.endsWith("/")) {
		return uri.replace(/\/+$/, "");
	}

	return uri;
};
