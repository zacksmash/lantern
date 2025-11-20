import { HttpResponse, ResponseBuilder, response } from "@core/Http/Response";
import { ResponseFactory } from "@core/Http/ResponseFactory";

test("response macros can be registered and invoked", async () => {
	ResponseFactory.macro("caps", (value: string) =>
		HttpResponse.make(value.toUpperCase()),
	);
	ResponseBuilder.macro("withPoweredBy", () =>
		response().header("x-powered-by", "lantern"),
	);

	const macroResponse = ResponseFactory.callMacro("caps", "hello");
	const finalResponse =
		macroResponse instanceof Response
			? macroResponse
			: macroResponse.toResponse();
	expect(await finalResponse.text()).toBe("HELLO");

	const builder = ResponseBuilder.callMacro("withPoweredBy");
	const built = builder.json({ ok: true }).toResponse();
	expect(built.headers.get("x-powered-by")).toBe("lantern");
});
