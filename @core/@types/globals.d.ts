declare global {
	var env: typeof import("@core/Env")["env"];
	var config: typeof import("@core/Config")["config"];
	var route: typeof import("@core/Routing/Facades/URL")["route"];
	var inertia: typeof import("@core/Inertia/Inertia")["inertia"];
	var view: typeof import("@core/View/view")["view"];
}

export {};
