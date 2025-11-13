import { Env } from "@core/Env";
import { HttpKernel } from "@core/HttpKernel";
import { RequestContext } from "@core/RequestContext";

const HandleResponse = async (request: Request): Promise<Response> => {
	new Env().load();

	return await RequestContext.run(
		request,
		async () => await new HttpKernel(request).boot(),
	);
};

const HandleError = async (error: any): Promise<Response> => {
	const environment = env("APP_ENV", "production");

	if (environment === "development") {
		if (error instanceof Response) {
			return error;
		}

		throw error;
	}

	return new Response("Internal Server Error", { status: 500 });
};

export { HandleResponse, HandleError };
