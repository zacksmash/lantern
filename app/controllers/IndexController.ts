export class IndexController {
	invoke(): Response {
		return new Response(`<div>${config("app.env")}</div>`, {
			headers: { "Content-Type": "text/html" },
			status: 200,
		});
	}
}
