import type { HttpRequest } from "@core/Http/Request";

export interface ExceptionContext {
	request?: HttpRequest;
	environment: string;
	debug: boolean;
}

export type ExceptionReportCallback = (
	error: unknown,
	context: ExceptionContext,
) => void | Promise<void>;

export type ExceptionRenderCallback = (
	error: unknown,
	context: ExceptionContext,
) => Response | Promise<Response> | void | Promise<void>;

export class Exceptions {
	private readonly reporters: ExceptionReportCallback[] = [];
	private readonly renderers: ExceptionRenderCallback[] = [];

	constructor(
		private readonly defaults: Pick<ExceptionContext, "environment" | "debug">,
	) {}

	report(callback: ExceptionReportCallback): this {
		this.reporters.push(callback);
		return this;
	}

	render(callback: ExceptionRenderCallback): this {
		this.renderers.push(callback);
		return this;
	}

	async reportAll(error: unknown, request?: HttpRequest): Promise<void> {
		const context: ExceptionContext = {
			request,
			environment: this.defaults.environment,
			debug: this.defaults.debug,
		};

		for (const reporter of this.reporters) {
			await reporter(error, context);
		}
	}

	async renderFor(
		error: unknown,
		request?: HttpRequest,
	): Promise<Response | undefined> {
		const context: ExceptionContext = {
			request,
			environment: this.defaults.environment,
			debug: this.defaults.debug,
		};

		for (const renderer of this.renderers) {
			const response = await renderer(error, context);
			if (response) {
				return response;
			}
		}

		return undefined;
	}
}
