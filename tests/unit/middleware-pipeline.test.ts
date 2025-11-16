import type { MiddlewareIdentifier } from "@core/Foundation/Http/Middleware";
import type {
	MiddlewareContract,
	MiddlewareNext,
	MiddlewareResolver,
} from "@core/Foundation/Http/Middleware/Contracts";
import { MiddlewarePipeline } from "@core/Foundation/Http/Middleware/Pipeline";
import { HttpRequest } from "@core/Http/Request";

const request = HttpRequest.capture(new Request("http://localhost"));

class RecordingMiddleware implements MiddlewareContract {
	constructor(
		private readonly label: string,
		private readonly log: string[],
	) {}

	async handle(req: HttpRequest, next: MiddlewareNext, ...params: string[]) {
		this.log.push(`${this.label}:${params.join(",")}`);
		return next(req);
	}
}

const makeResolver = (log: string[]): MiddlewareResolver => {
	return (token) => {
		if (token === FirstMiddleware) {
			return new FirstMiddleware(log) as any;
		}
		if (token === SecondMiddleware) {
			return new SecondMiddleware(log) as any;
		}
		if (token === AliasMiddleware) {
			return new AliasMiddleware(log) as any;
		}
		throw new Error("Unknown binding");
	};
};

class FirstMiddleware extends RecordingMiddleware {
	constructor(log: string[]) {
		super("first", log);
	}
}

class SecondMiddleware extends RecordingMiddleware {
	constructor(log: string[]) {
		super("second", log);
	}
}

class AliasMiddleware extends RecordingMiddleware {
	constructor(log: string[]) {
		super("alias", log);
	}
}

test("runs middleware stack in order and resolves aliases with parameters", async () => {
	const log: string[] = [];
	const pipeline = new MiddlewarePipeline(makeResolver(log), {
		alias: AliasMiddleware,
	});

	const stack: MiddlewareIdentifier[] = [
		FirstMiddleware,
		"alias:api",
		SecondMiddleware,
	];
	const response = await pipeline.handle(stack, request, async () => "done");

	expect(response).toBe("done");
	expect(log).toEqual(["first:", "alias:api", "second:"]);
});
