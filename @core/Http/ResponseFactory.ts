import { HttpResponse, ResponseBuilder } from "./Response";

export type ResponseValue =
	| Response
	| ResponseBuilder
	| string
	| number
	| boolean
	| Record<string, unknown>
	| unknown[]
	| Date
	| null
	| undefined;

export class ResponseFactory {
	private static macros: Map<
		string,
		(...args: any[]) => Response | ResponseBuilder
	> = new Map();

	static macro(
		name: string,
		callback: (...args: any[]) => Response | ResponseBuilder,
	): void {
		ResponseFactory.macros.set(name, callback);
	}

	static hasMacro(name: string): boolean {
		return ResponseFactory.macros.has(name);
	}

	static callMacro(name: string, ...args: any[]): Response | ResponseBuilder {
		const macro = ResponseFactory.macros.get(name);
		if (!macro) {
			throw new Error(`Response macro [${name}] is not defined.`);
		}

		return macro(...args);
	}

	static prepare(value: ResponseValue, init?: ResponseInit): Response {
		if (value instanceof Response) {
			return value;
		}

		if (value instanceof ResponseBuilder) {
			return value.toResponse();
		}

		if (value === null || typeof value === "undefined") {
			return HttpResponse.noContent();
		}

		if (typeof value === "string") {
			return HttpResponse.make(value, {
				...init,
				headers: {
					"content-type": "text/html; charset=utf-8",
					...(init?.headers ?? {}),
				},
			});
		}

		if (typeof value === "number" || typeof value === "boolean") {
			return HttpResponse.make(String(value), {
				...init,
				headers: {
					"content-type": "text/plain; charset=utf-8",
					...(init?.headers ?? {}),
				},
			});
		}

		if (value instanceof Date) {
			return HttpResponse.json(value.toISOString(), init);
		}

		if (Array.isArray(value) || typeof value === "object") {
			return HttpResponse.json(value, init);
		}

		return HttpResponse.json(value, init);
	}
}
