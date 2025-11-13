export class IndexController {
	invoke(): Response {
		return new Response("<div>Index Controller Response</div>", {
			headers: { "Content-Type": "text/html" },
			status: 200,
		});
	}
}
