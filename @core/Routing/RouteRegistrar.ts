import type { MiddlewareIdentifier } from "@core/Foundation/Http/Middleware";
import type { ControllerConstructor, RouteGroupAttributes } from "./Route";
import type { Router } from "./Router";

export class RouteRegistrar {
	private attributes: RouteGroupAttributes = {};

	constructor(private readonly router: Router) {}

	middleware(middleware: MiddlewareIdentifier | MiddlewareIdentifier[]): this {
		this.mergeAttribute("middleware", middleware);
		return this;
	}

	prefix(prefix: string): this {
		this.attributes.prefix = (this.attributes.prefix ?? "") + prefix;
		return this;
	}

	name(name: string): this {
		this.attributes.name = (this.attributes.name ?? "") + name;
		return this;
	}

	namespace(namespace: string): this {
		this.attributes.namespace = namespace;
		return this;
	}

	controller(controller: ControllerConstructor): this {
		this.attributes.controller = controller;
		return this;
	}

	group(callback: () => void | Promise<void>): void | Promise<void> {
		return this.router.group(this.attributes, callback);
	}

	private mergeAttribute(
		key: keyof RouteGroupAttributes,
		value: MiddlewareIdentifier | MiddlewareIdentifier[],
	) {
		if (key !== "middleware") {
			return;
		}

		const existing = this.attributes.middleware;

		if (Array.isArray(existing)) {
			this.attributes.middleware = Array.isArray(value)
				? [...existing, ...value]
				: [...existing, value];
		} else if (existing) {
			this.attributes.middleware = Array.isArray(value)
				? [existing, ...value]
				: [existing, value];
		} else {
			this.attributes.middleware = value;
		}
	}
}
