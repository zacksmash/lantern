Bun.serve({
	development: process.env.APP_ENV === "development",
	fetch: async (request: Request) => // Handle the request,
	error: (error: any) => // Handle errors,
});
