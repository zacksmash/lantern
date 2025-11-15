import { expect, test } from "bun:test";
import { HttpRequest } from "@core/Http/Request";
import { ValidationException } from "@core/Validation/ValidationException";

const createRequest = (url: string, body: Record<string, any>) =>
	new HttpRequest(
		new Request(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);

test("request aggregates payload and validates data", async () => {
	const request = createRequest("http://localhost/register?role=user", {
		email: "user@example.com",
		age: "27",
	});

	const validated = await request.validate({
		email: "required|email",
		age: "required|integer|min:18",
		role: "required|in:user,admin",
	});

	expect(validated).toEqual({
		email: "user@example.com",
		age: 27,
		role: "user",
	});
});

test("request validation throws detailed errors", async () => {
	const request = createRequest("http://localhost/register", {
		email: "not-an-email",
	});

	await expect(
		request.validate({
			email: "required|email",
			password: "required|min:8",
		}),
	).rejects.toThrow(ValidationException);
});
