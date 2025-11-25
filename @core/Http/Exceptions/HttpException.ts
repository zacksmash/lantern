type HeadersInput = ResponseInit["headers"];

type BodyInput = RequestInit["body"];

export class HttpException extends Error {
	status: number;
	headers: HeadersInput;
	body?: BodyInput | null;

	constructor(
		message: string,
		status = 500,
		options?: {
			headers?: HeadersInput;
			body?: BodyInput | null;
		},
	) {
		super(message);
		this.status = status;
		this.headers = options?.headers ?? {};
		this.body = options?.body;
	}

	toResponse(): Response {
		const responseBody =
			typeof this.body === "undefined" ? this.message : this.body;

		return new Response(responseBody, {
			status: this.status,
			statusText: this.message,
			headers: this.headers,
		});
	}
}
