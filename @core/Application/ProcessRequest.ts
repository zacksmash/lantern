import { RequestContext } from "@core/Application/RequestContext";
import { HttpKernel } from "@core/Http/Kernel";
import { HttpRequest } from "@core/Http/Request";
import { ValidationException } from "@core/Validation/ValidationException";
import { app } from "@root/bootstrap/app";

const HandleResponse = async (request: Request): Promise<Response> => {
	const httpRequest = new HttpRequest(request);

	return await RequestContext.run(
		httpRequest,
		async () =>
			await app
				.getContainer()
				.runScope(async () => await new HttpKernel(httpRequest).boot()),
	);
};

const HandleError = async (error: unknown): Promise<Response> => {
	const environment = env("APP_ENV", "production");

	if (error instanceof ValidationException) {
		return new Response(JSON.stringify(error.toJSON()), {
			status: error.status,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (environment === "development") {
		if (error instanceof Response) {
			return error;
		}

		throw error;
	}

	return new Response("Internal Server Error", { status: 500 });
};

export { HandleResponse, HandleError };
