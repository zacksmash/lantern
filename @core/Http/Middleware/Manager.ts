import type { Container } from "@core/Container";
import type { Middleware } from "@core/Http/Middleware/Contracts";
import {
	MiddlewareConfig,
	type MiddlewareConfiguration,
} from "@core/Http/Middleware/Manifest";
import type {
	MiddlewareConstructor,
	MiddlewareIdentifier,
} from "@core/Routing/Route";

export class MiddlewareManager {
	constructor(private config: MiddlewareConfiguration) {}

	getGlobalMiddleware(container: Container): Middleware[] {
		return this.instantiate(this.expandList(this.config.global), container);
	}

	getRouteMiddleware(
		identifiers: MiddlewareIdentifier[] | undefined,
		container: Container,
	): Middleware[] {
		if (!identifiers || identifiers.length === 0) return [];
		const constructors = this.expandList(identifiers);
		return this.instantiate(constructors, container);
	}

	expandList(identifiers: MiddlewareIdentifier[]): MiddlewareConstructor[] {
		const results: MiddlewareConstructor[] = [];
		for (const identifier of identifiers) {
			results.push(...this.expandIdentifier(identifier, new Set()));
		}
		return results;
	}

	private expandIdentifier(
		identifier: MiddlewareIdentifier,
		visited: Set<string>,
	): MiddlewareConstructor[] {
		if (typeof identifier === "string") {
			if (visited.has(identifier)) {
				throw new Error(
					`Circular middleware reference detected for "${identifier}".`,
				);
			}

			const group = this.config.groups[identifier];
			if (group) {
				visited.add(identifier);
				const expandedGroup = group.flatMap((item) =>
					this.expandIdentifier(item, visited),
				);
				visited.delete(identifier);
				return expandedGroup;
			}

			const alias = this.config.aliases[identifier];
			if (alias) {
				return this.expandIdentifier(alias, visited);
			}

			throw new Error(
				`Middleware alias or group "${identifier}" is not registered.`,
			);
		}

		return [identifier];
	}

	private instantiate(
		constructors: MiddlewareConstructor[],
		container: Container,
	): Middleware[] {
		return constructors.map((ctor) => container.resolve(ctor));
	}
}

export const middlewareManager = new MiddlewareManager(MiddlewareConfig);
