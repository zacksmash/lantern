export class IndexController {
	invoke(): Response {
		return new Response(`<div>${env("APP_GREETING", "Hello, World!")}</div>`, {
			headers: { "Content-Type": "text/html" },
			status: 200,
		});
	}
}
