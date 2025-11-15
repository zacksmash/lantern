declare global {
	var env: typeof import("@core/Env")["env"];
	var config: typeof import("@core/Config")["config"];
	var route: typeof import("@core/Support/Facades/URL")["route"];
	var inertia: typeof import("@core/Inertia/Inertia")["inertia"];
	var view: typeof import("@core/View/view")["view"];
	var auth: typeof import("@core/Support/Facades/Auth")["auth"];
	var cache: typeof import("@core/Support/Facades/Cache")["cache"];
	var session: typeof import("@core/Support/Facades/Session")["session"];
	var db: typeof import("@core/Support/Facades/DB")["db"];
}

export {};
