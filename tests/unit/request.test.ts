import { HttpRequest } from "@core/Http/Request";
import { ValidationException } from "@core/Validation/ValidationException";

const makeRequest = (
	init?: RequestInit,
	url = "http://localhost/test?hello=world",
) =>
	HttpRequest.capture(
		new Request(url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				...(init?.headers ?? {}),
			},
			body: JSON.stringify({ name: "Lantern", email: "hello@example.com" }),
			...init,
		}),
		{ user: "42" },
	);

test("merges body + query data via all()", async () => {
	const request = makeRequest();
	const all = await request.all();

	expect(all).toMatchObject({
		hello: "world",
		name: "Lantern",
		email: "hello@example.com",
	});
});

test("retrieves route params and bearer tokens", () => {
	const req = HttpRequest.capture(
		new Request("http://localhost/profile", {
			headers: {
				authorization: "Bearer secret-token",
			},
		}),
		{ profile: "me" },
	);

	expect(req.route("profile")).toBe("me");
	expect(req.bearerToken()).toBe("secret-token");
});

test("validates payloads using simple rules", async () => {
	const request = makeRequest();
	const validated = await request.validate({
		name: "required|string|min:3",
		email: "required|email",
	});

	expect(validated.name).toBe("Lantern");
	expect(request.validated<Record<string, unknown>>()).toEqual(
		validated as Record<string, unknown>,
	);
});

test("throws ValidationException for invalid data", async () => {
	const request = makeRequest(
		{
			body: JSON.stringify({ name: "" }),
		},
		"http://localhost/test",
	);

	await expect(
		request.validate({
			name: "required",
			email: "required|email",
		}),
	).rejects.toBeInstanceOf(ValidationException);
});
