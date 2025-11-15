import { expect, test } from "bun:test";
import { RequestContext } from "@core/Application/RequestContext";
import { AuthManager } from "@core/Auth/AuthManager";
import { HttpRequest } from "@core/Http/Request";
import { Session } from "@core/Session/Session";
import { Hash } from "@core/Support/Hash";

const authConfig = (hashedPassword: string) => ({
	defaults: {
		guard: "web",
	},
	guards: {
		web: {
			driver: "session" as const,
			provider: "users",
		},
	},
	providers: {
		users: {
			driver: "array" as const,
			identifier: "email",
			users: [
				{
					id: 1,
					email: "user@example.com",
					name: "Test User",
					password: hashedPassword,
				},
			],
		},
	},
});

test("auth manager reads user from session", async () => {
	const request = new HttpRequest(new Request("http://localhost"));
	const session = new Session("test", {});
	session.put("auth_user", { id: 1, name: "Test User" });
	request.setSession(session);

	await RequestContext.run(request, async () => {
		const auth = new AuthManager(authConfig(""));
		expect(auth.check()).toBe(true);
		expect(auth.user()?.name).toBe("Test User");
	});
});

test("auth manager attempts login with credentials", async () => {
	const hash = await Hash.make("secret");
	const request = new HttpRequest(new Request("http://localhost"));
	const session = new Session("attempt", {});
	request.setSession(session);

	await RequestContext.run(request, async () => {
		const auth = new AuthManager(authConfig(hash));
		const success = await auth.attempt({
			email: "user@example.com",
			password: "secret",
		});

		expect(success).toBe(true);
		expect(auth.check()).toBe(true);
		expect(auth.user()?.name).toBe("Test User");

		auth.logout();
		expect(auth.check()).toBe(false);
	});
});

test("auth manager attempt fails with invalid credentials", async () => {
	const hash = await Hash.make("secret");
	const request = new HttpRequest(new Request("http://localhost"));
	const session = new Session("attempt-fail", {});
	request.setSession(session);

	await RequestContext.run(request, async () => {
		const auth = new AuthManager(authConfig(hash));
		const success = await auth.attempt({
			email: "user@example.com",
			password: "bad",
		});

		expect(success).toBe(false);
		expect(auth.check()).toBe(false);
	});
});
