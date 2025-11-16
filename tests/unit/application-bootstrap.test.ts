import { Application } from "@core/Foundation/Application";
import type { ExceptionHandlerContract } from "@core/Foundation/Exceptions/Handler";
import {
	type ApplicationContract,
	ServiceProvider,
} from "@core/Foundation/ServiceProvider";

class FooProvider extends ServiceProvider {
	public registerCalls: number = 0;
	public bootCalls: number = 0;
	public bootedCalls: number = 0;

	override register(): void {
		this.registerCalls++;
		this.app.bind("foo", () => "bar");
	}

	override boot(): void {
		this.bootCalls++;
	}

	override booted(): void {
		this.bootedCalls++;
	}
}

class LifecycleProvider extends ServiceProvider {
	constructor(
		app: ApplicationContract,
		private readonly stack: string[],
	) {
		super(app);
	}

	override register(): void {
		this.stack.push("register");
		this.app.booting(() => this.stack.push("booting:callback"));
		this.app.booted(() => this.stack.push("booted:callback"));
	}

	override boot(): void {
		this.stack.push("boot");
	}

	override booted(): void {
		this.stack.push("booted");
	}
}

class FakeExceptionHandler implements ExceptionHandlerContract {
	public reported: unknown[] = [];
	public rendered: Response[] = [];

	async report(error: unknown): Promise<void> {
		this.reported.push(error);
	}

	async render(error: unknown): Promise<Response> {
		const response = new Response(`handled:${(error as Error).message}`, {
			status: 500,
		});
		this.rendered.push(response);
		return response;
	}

	async shouldReport(): Promise<boolean> {
		return true;
	}
}

test("registers providers, boots them, and resolves bindings from the container", async () => {
	const app = new Application({
		basePath: process.cwd(),
		appName: "Test",
		environment: "testing",
	})
		.withProviders([FooProvider], false)
		.create();

	const foo = app.make<string>("foo");
	expect(foo).toBe("bar");

	const provider = app.getProvider(FooProvider);
	expect(provider?.bootCalls).toBe(1);
	expect(provider?.bootedCalls).toBe(1);
});

test("fires booting and booted callbacks around provider boot sequence", async () => {
	const order: string[] = [];
	const app = new Application({
		basePath: process.cwd(),
		appName: "Test",
		environment: "testing",
	})
		.withProviders(
			[
				class extends LifecycleProvider {
					constructor(appInstance: ApplicationContract) {
						super(appInstance, order);
					}
				},
			],
			false,
		)
		.create();

	const request = app.captureRequest(new Request("http://localhost"));
	const response = await app.dispatch(request);
	await app.terminate(request, response);

	expect(order).toStrictEqual([
		"register",
		"booting:callback",
		"boot",
		"booted",
		"booted:callback",
	]);
});

test("delegates reporting/rendering to the resolved exception handler", async () => {
	const handler = new FakeExceptionHandler();

	const app = new Application({
		basePath: process.cwd(),
		appName: "Test",
		environment: "testing",
	})
		.bind(FakeExceptionHandler, () => handler)
		.withExceptionHandler(FakeExceptionHandler)
		.create();

	const response = await app.handleError(new Error("boom"));
	expect(await response.text()).toBe("handled:boom");
	expect(handler.reported).toHaveLength(1);
	expect(handler.rendered).toHaveLength(1);
});
