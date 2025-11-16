import type { ControllerConstructor } from "./Route";
import type { Router } from "./Router";

type ResourceAction =
	| "index"
	| "create"
	| "store"
	| "show"
	| "edit"
	| "update"
	| "destroy";

const DEFAULT_ACTIONS: Record<
	ResourceAction,
	{
		methods: string[];
		uri: string;
	}
> = {
	index: { methods: ["GET"], uri: "/" },
	create: { methods: ["GET"], uri: "/create" },
	store: { methods: ["POST"], uri: "/" },
	show: { methods: ["GET"], uri: "/{resource}" },
	edit: { methods: ["GET"], uri: "/{resource}/edit" },
	update: { methods: ["PUT", "PATCH"], uri: "/{resource}" },
	destroy: { methods: ["DELETE"], uri: "/{resource}" },
};

const API_ACTIONS: ResourceAction[] = [
	"index",
	"store",
	"show",
	"update",
	"destroy",
];

export interface ResourceOptions {
	only?: ResourceAction[];
	except?: ResourceAction[];
	names?: Partial<Record<ResourceAction, string>>;
}

export class ResourceRegistrar {
	constructor(private readonly router: Router) {}

	register(
		name: string,
		controller: ControllerConstructor,
		options: ResourceOptions = {},
		api = false,
	): void {
		const actions = this.resolveActions(options, api);
		const baseName = this.getResourceName(name);
		const baseUri = this.getResourceUri(name);
		const parameter = this.getResourceWildcard(name);

		for (const action of actions) {
			const routeOptions = DEFAULT_ACTIONS[action];
			const uri = this.formatUri(baseUri, routeOptions.uri, parameter);
			const route = this.router.addRoute(routeOptions.methods, uri, [
				controller,
				this.getActionMethod(action),
			]);

			const actionName = options.names?.[action] ?? action;
			route.name(`${baseName}.${actionName}`);
		}
	}

	protected resolveActions(
		options: ResourceOptions,
		api: boolean,
	): ResourceAction[] {
		let actions = Object.keys(DEFAULT_ACTIONS) as ResourceAction[];

		if (api) {
			actions = actions.filter((action) => API_ACTIONS.includes(action));
		}

		if (options.only) {
			actions = actions.filter((action) => options.only!.includes(action));
		}

		if (options.except) {
			actions = actions.filter((action) => !options.except!.includes(action));
		}

		return actions;
	}

	protected getResourceName(name: string): string {
		return name.replace(/\//g, ".").replace(/\.+/g, ".");
	}

	protected getResourceUri(name: string): string {
		const segments = name.split(".");
		return segments
			.slice(0, -1)
			.map((segment) => `${segment}/{${this.getWildcard(segment)}}`)
			.concat(segments.slice(-1))
			.join("/")
			.replace(/\/+/g, "/");
	}

	protected getResourceWildcard(name: string): string {
		const segments = name.split(".");
		return this.getWildcard(segments[segments.length - 1]!);
	}

	protected getWildcard(value: string): string {
		const normalized = value.replace(/-/g, "_");
		if (normalized.endsWith("s")) {
			return normalized.slice(0, -1);
		}

		return normalized;
	}

	protected getActionMethod(action: ResourceAction): string {
		return action;
	}

	protected formatUri(base: string, suffix: string, parameter: string): string {
		return `${this.normalize(base)}${suffix.replace(
			"{resource}",
			`{${parameter}}`,
		)}`.replace(/\/+/g, "/");
	}

	private normalize(uri: string): string {
		if (!uri.startsWith("/")) {
			return `/${uri}`;
		}

		return uri;
	}
}
