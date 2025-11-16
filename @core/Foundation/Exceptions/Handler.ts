import type { HttpRequest } from "@core/Http/Request";

export interface ExceptionHandlerContract {
	report(error: unknown, request?: HttpRequest): Promise<void> | void;
	render(
		error: unknown,
		request?: HttpRequest,
	): Promise<Response | undefined> | Response | undefined;
	shouldReport?(error: unknown): Promise<boolean> | boolean;
	register?(): void;
}

type ReportableCallback = (
	error: unknown,
	request?: HttpRequest,
) => void | Promise<void>;

type RenderableCallback = (
	error: unknown,
	request?: HttpRequest,
) => Response | Promise<Response> | undefined;

export abstract class ExceptionHandler implements ExceptionHandlerContract {
	protected dontReport: Array<new (...args: any[]) => Error> = [];
	protected reportableCallbacks: ReportableCallback[] = [];
	protected renderableCallbacks: RenderableCallback[] = [];
	register?(): void;

	constructor() {
		this.register?.();
	}

	async report(error: unknown, request?: HttpRequest): Promise<void> {
		if (!(await this.shouldReport(error))) {
			return;
		}

		for (const callback of this.reportableCallbacks) {
			await callback(error, request);
		}
	}

	async render(
		error: unknown,
		request?: HttpRequest,
	): Promise<Response | undefined> {
		for (const callback of this.renderableCallbacks) {
			const response = await callback(error, request);
			if (response) {
				return response;
			}
		}

		return undefined;
	}

	async shouldReport(error: unknown): Promise<boolean> {
		if (!(error instanceof Error)) {
			return true;
		}

		return !this.dontReport.some((type) => error instanceof type);
	}

	protected reportable(callback: ReportableCallback): void {
		this.reportableCallbacks.push(callback);
	}

	protected renderable(callback: RenderableCallback): void {
		this.renderableCallbacks.push(callback);
	}
}
