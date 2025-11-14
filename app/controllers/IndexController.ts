export class IndexController {
	invoke(): Response {
		return new Response(`<div>Hello, world!</div>`, {
			headers: { "Content-Type": "text/html" },
			status: 200,
		});
	}
}
