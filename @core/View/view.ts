import { ViewEngine, type ViewOptions } from "@core/View/ViewEngine";

const defaultEngine = new ViewEngine();

export const view = async (
	viewName: string,
	data: Record<string, unknown> = {},
	options: ViewOptions = {},
): Promise<Response> => {
	const html = await defaultEngine.render(viewName, data);
	return new Response(html, {
		status: options.status ?? 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			...(options.headers ?? {}),
		},
	});
};
