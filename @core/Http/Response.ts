type BodyInput = ConstructorParameters<typeof Response>[0];
type ResponseInitInput = ConstructorParameters<typeof Response>[1];
type HeadersInput = ConstructorParameters<typeof Headers>[0];

export class ResponseBuilder {
	private statusCode: number;
	private readonly headers: Headers;
	private body: BodyInput;

	constructor(body?: BodyInput, init: ResponseInitInput = {}) {
		this.statusCode = init?.status ?? 200;
		this.headers = new Headers(init?.headers as HeadersInput);
		this.body = body ?? null;
	}

	status(code: number): this {
		this.statusCode = code;
		return this;
	}

	header(name: string, value: string): this {
		this.headers.set(name, value);
		return this;
	}

	withHeaders(headers: Record<string, string>): this {
		for (const [key, value] of Object.entries(headers)) {
			this.headers.set(key, value);
		}

		return this;
	}

	send(body: BodyInput): this {
		this.body = body ?? null;
		return this;
	}

	json(data: unknown): this {
		this.body = JSON.stringify(data);
		this.headers.set("content-type", "application/json");
		return this;
	}

	toResponse(): Response {
		return new Response(this.body, {
			status: this.statusCode,
			headers: this.headers,
		});
	}
}

export class HttpResponse {
	static make(body?: BodyInput, init?: ResponseInitInput): Response {
		return new ResponseBuilder(body, init).toResponse();
	}

	static json(data: unknown, init: ResponseInitInput = {}): Response {
		const builder = new ResponseBuilder(null, init);
		builder.json(data);
		return builder.toResponse();
	}

	static noContent(status = 204): Response {
		return new Response(null, {
			status,
		});
	}

	static redirect(url: string | URL, status = 302): Response {
		const target = typeof url === "string" ? url : url.toString();
		return Response.redirect(target, status);
	}
}

export const response = (
	body?: BodyInput,
	init?: ResponseInitInput,
): ResponseBuilder => new ResponseBuilder(body, init);
