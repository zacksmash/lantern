export class HttpRequest {
	constructor(public readonly raw: Request) {}

	static capture(raw: Request): HttpRequest {
		return new HttpRequest(raw);
	}

	get method(): string {
		return this.raw.method;
	}

	get url(): URL {
		return new URL(this.raw.url);
	}

	headers(): Headers {
		return this.raw.headers;
	}

	async json<T = unknown>(): Promise<T> {
		return (await this.raw.json()) as T;
	}

	async text(): Promise<string> {
		return this.raw.text();
	}
}
