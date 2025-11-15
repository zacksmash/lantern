import { expect, test } from "bun:test";
import { Container } from "@core/Container";
import { Inject, Injectable } from "@core/Container/Decorators";
import { createToken } from "@core/Container/Tokens";

class ExampleService {
	message() {
		return "hello";
	}
}

@Injectable()
class ExampleController {
	constructor(public service: ExampleService) {}
}

class TokenService {
	constructor(public name: string) {}
}

const TokenServiceToken = createToken<TokenService>("token.service");

@Injectable()
class ControllerWithToken {
	service: TokenService;

	constructor(@Inject(TokenServiceToken) service: TokenService) {
		this.service = service;
	}
}

test("container resolves classes using constructor parameter types", () => {
	const container = new Container();

	container.singleton(ExampleService, ExampleService);

	const instance = container.resolve(ExampleController);

	expect(instance).toBeInstanceOf(ExampleController);
	expect(instance.service).toBeInstanceOf(ExampleService);
	expect(instance.service.message()).toBe("hello");
});

test("container uses @Inject decorator for interface or token bindings", () => {
	const container = new Container();
	container.singleton(TokenServiceToken, () => new TokenService("token"));

	const controller = container.resolve(ControllerWithToken);

	expect(controller.service).toBeInstanceOf(TokenService);
	expect(controller.service.name).toBe("token");
});

test("container resolves scoped bindings per scope run", async () => {
	const container = new Container();
	let creationCount = 0;
	const RequestIdToken = createToken<{ id: number }>("request.id");

	container.scoped(RequestIdToken, () => {
		return { id: ++creationCount };
	});

	let firstScopeValue: { id: number } | undefined;

	await container.runScope(async () => {
		const a = container.resolve(RequestIdToken);
		const b = container.resolve(RequestIdToken);
		expect(a).toBe(b);
		firstScopeValue = a;
	});

	await container.runScope(async () => {
		const c = container.resolve(RequestIdToken);
		expect(c).not.toBe(firstScopeValue);
		expect(c.id).toBeGreaterThan(firstScopeValue?.id ?? 0);
	});
});
