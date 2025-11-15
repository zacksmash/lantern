import { HandleError, HandleResponse } from "@core/Application/ProcessRequest";

Bun.serve({
	development: process.env.APP_ENV === "development",
	fetch: async (request: Request) => HandleResponse(request),
	error: (error: any) => HandleError(error),
});
