import { Route } from "@core/Support/Facades/Route";

Route.get("/", () => {
	return {
		message: "Welcome to Lantern!",
	};
});
