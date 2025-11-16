import type { HttpRequest } from "@core/Http/Request";
import type { ResponseValue } from "@core/Http/ResponseFactory";
import type {
	MiddlewareContractConstructor,
	MiddlewareFunction,
	MiddlewareIdentifier,
	MiddlewareNext,
	MiddlewareResolver,
} from "./Contracts";

interface ResolvedMiddleware {
	handler: MiddlewareFunction;
	parameters: string[];
}

export class MiddlewarePipeline {
	constructor(
		private readonly resolveBinding: MiddlewareResolver,
		private readonly aliases: Record<string, MiddlewareIdentifier>,
	) {}

	async handle(
		stack: MiddlewareIdentifier[],
		request: HttpRequest,
		finalHandler: MiddlewareNext,
	): Promise<ResponseValue> {
		const composed = stack.reduceRight<MiddlewareNext>((next, middleware) => {
			return async (req) => {
				const { handler, parameters } = this.resolveMiddleware(middleware);
				return handler(req, next, ...parameters);
			};
		}, finalHandler);

		return composed(request);
	}

	private resolveMiddleware(
		identifier: MiddlewareIdentifier,
	): ResolvedMiddleware {
		if (typeof identifier === "string") {
			const [aliasName, params] = identifier.split(":");
			const name = aliasName ?? identifier;
			const aliasTarget = this.aliases[name];
			if (!aliasTarget) {
				throw new Error(`Middleware alias "${name}" is not defined.`);
			}

			const parameters = params ? params.split(",").map((v) => v.trim()) : [];
			const resolved = this.resolveMiddleware(aliasTarget);
			return {
				handler: resolved.handler,
				parameters: [...parameters, ...resolved.parameters],
			};
		}

		if (this.isMiddlewareClass(identifier)) {
			const instance = this.resolveBinding(
				identifier as MiddlewareContractConstructor,
			);
			return {
				handler: (request, next, ...params) =>
					instance.handle(request, next, ...params),
				parameters: [],
			};
		}

		return {
			handler: identifier as MiddlewareFunction,
			parameters: [],
		};
	}

	private isMiddlewareClass(
		value: MiddlewareIdentifier,
	): value is MiddlewareContractConstructor {
		return (
			typeof value === "function" &&
			typeof value.prototype?.handle === "function"
		);
	}
}
