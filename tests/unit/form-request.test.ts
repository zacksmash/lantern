import { FormRequest } from "@core/Http/FormRequest";
import { HttpRequest } from "@core/Http/Request";

class CreateUserRequest extends FormRequest {
	// eslint-disable-next-line @typescript-eslint/require-await
	override async authorize(): Promise<boolean> {
		return this.header("x-allow") === "yes";
	}

	override rules() {
		return {
			name: "required|string|min:3",
		};
	}
}

test("form requests authorize and validate before use", async () => {
	const raw = new Request("http://localhost/users", {
		method: "POST",
		headers: { "content-type": "application/json", "x-allow": "yes" },
		body: JSON.stringify({ name: "Lantern" }),
	});
	const baseRequest = HttpRequest.capture(raw);

	const form = await FormRequest.fromRequest(baseRequest, CreateUserRequest);
	expect(form.validated<{ name: string }>().name).toBe("Lantern");
});

test("form requests throw on failed authorization", async () => {
	const raw = new Request("http://localhost/users", {
		method: "POST",
		headers: { "content-type": "application/json", "x-allow": "no" },
		body: JSON.stringify({ name: "Lantern" }),
	});
	const baseRequest = HttpRequest.capture(raw);

	await expect(
		FormRequest.fromRequest(baseRequest, CreateUserRequest),
	).rejects.toThrow("This action is unauthorized.");
});
