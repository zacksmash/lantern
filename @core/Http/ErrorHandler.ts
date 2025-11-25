import { HttpException } from "@core/Http/Exceptions/HttpException";

type HandlerOptions = {
	request?: Request;
	allowDebugRethrow?: boolean;
};

type ErrorHandlerConfig = {
	debug?: boolean;
	appName?: string;
};

const DEFAULT_TITLE = "Server Error";

export class ErrorHandler {
	private readonly debug: boolean;
	private readonly appName: string;

	constructor(config?: ErrorHandlerConfig) {
		this.debug = config?.debug ?? false;
		this.appName = config?.appName ?? "Lantern";
	}

	handle(error: unknown, options?: HandlerOptions): Response {
		const normalizedError = this.normalizeError(error);

		if (normalizedError instanceof HttpException) {
			return normalizedError.toResponse();
		}

		if (this.debug && options?.allowDebugRethrow) {
			// Let Bun render its development error page.
			throw normalizedError;
		}

		return this.genericResponse(normalizedError, options?.request);
	}

	protected normalizeError(error: unknown): Error {
		if (error instanceof Error) {
			return error;
		}

		return new Error(typeof error === "string" ? error : "Unknown error");
	}

	protected genericResponse(error: Error, request?: Request): Response {
		const html = this.productionTemplate(error, request);

		return new Response(html, {
			status: 500,
			headers: {
				"content-type": "text/html; charset=utf-8",
			},
		});
	}

	protected productionTemplate(error: Error, request?: Request): string {
		const path = request?.url ? new URL(request.url).pathname : "";
		const title = `${this.appName} - ${DEFAULT_TITLE}`;

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111827; padding: 32px; border-radius: 12px; max-width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); border: 1px solid #1f2937; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 4px 0; color: #94a3b8; }
    .muted { color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${DEFAULT_TITLE}</h1>
    <p>Something went wrong.</p>
    ${path ? `<p class="muted">Path: ${path}</p>` : ""}
    <p class="muted">Reference: ${error.message}</p>
  </div>
</body>
</html>`;
	}
}
