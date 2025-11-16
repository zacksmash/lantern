import { Application } from "@core/Foundation/Application";
import type { HttpKernel } from "@core/Foundation/Http/Kernel";
import type { HttpRequest } from "@core/Foundation/Http/Request";

class FakeKernel implements HttpKernel {
	constructor(private readonly response: Response) {}

	async handle(_request: HttpRequest): Promise<Response> {
		return this.response;
	}
}

class ExplodingKernel implements HttpKernel {
	async handle(_request: HttpRequest): Promise<Response> {
		throw new Error("boom");
	}
}

class TerminatingKernel implements HttpKernel {
	public terminatedWith: {
		request?: HttpRequest;
		response?: Response;
	} = {};

	async handle(_request: HttpRequest): Promise<Response> {
		return new Response("OK");
	}

	async terminate(request: HttpRequest, response: Response): Promise<void> {
		this.terminatedWith = { request, response };
	}
}

test("Application dispatches requests through the configured HttpKernel", async () => {
	const kernel = new FakeKernel(new Response("OK"));
	const app = new Application({
		basePath: process.cwd(),
		appName: "Lantern",
		environment: "test",
	})
		.useKernel(() => kernel)
		.create();

	const response = await app.handleRequest(new Request("http://localhost"));

	expect(response.status).toBe(200);
	expect(await response.text()).toBe("OK");
});

test("Application handles kernel failures with the configured exception renderer", async () => {
	const app = new Application({
		basePath: process.cwd(),
		appName: "Lantern",
		environment: "test",
		debug: false,
	})
		.useKernel(() => new ExplodingKernel())
		.withExceptions((exceptions) => {
			exceptions.render(() => new Response("Handled", { status: 500 }));
		})
		.create();

	const response = await app.handleRequest(new Request("http://localhost"));

	expect(response.status).toBe(500);
	expect(await response.text()).toBe("Handled");
});

test("Application falls back to a JSON debug response when in debug mode", async () => {
	const app = new Application({
		basePath: process.cwd(),
		appName: "Lantern",
		environment: "test",
		debug: true,
	})
		.useKernel(() => new ExplodingKernel())
		.create();

	const response = await app.handleRequest(new Request("http://localhost"));
	const payload = (await response.json()) as {
		message: string;
		error: { message: string };
	};

	expect(response.status).toBe(500);
	expect(payload.error.message).toBe("boom");
	expect(payload.message).toContain("Internal Server Error");
});

test("Application exposes Laravel-style capture/dispatch/terminate lifecycle", async () => {
	const kernel = new TerminatingKernel();
	const app = new Application({
		basePath: process.cwd(),
		appName: "Lantern",
		environment: "test",
	})
		.useKernel(() => kernel)
		.create();

	const rawRequest = new Request("http://localhost/foo");
	const httpRequest = app.captureRequest(rawRequest);
	const response = await app.dispatch(httpRequest);
	await app.terminate(httpRequest, response);

	expect(response.status).toBe(200);
	expect(kernel.terminatedWith.request).toBe(httpRequest);
	expect(kernel.terminatedWith.response).toBe(response);
});
