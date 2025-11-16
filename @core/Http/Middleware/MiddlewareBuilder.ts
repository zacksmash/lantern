import {
	MiddlewareConfig,
	registerGlobalMiddleware,
	registerMiddlewareAlias,
	type MiddlewareRegistrationOptions,
} from "@core/Http/Middleware/Manifest";
import { EncryptCookies } from "@core/Http/Middleware/RouteMiddleware";
import type { MiddlewareIdentifier } from "@core/Routing/Route";

type MiddlewareList = MiddlewareIdentifier | MiddlewareIdentifier[];

interface GroupOptions {
	append?: MiddlewareList;
	prepend?: MiddlewareList;
	set?: MiddlewareIdentifier[];
	remove?: MiddlewareList;
}

type GroupConfig = MiddlewareIdentifier | MiddlewareIdentifier[] | GroupOptions;

const toArray = (
	value?: MiddlewareIdentifier | MiddlewareIdentifier[],
): MiddlewareIdentifier[] =>
	value === undefined
		? []
		: Array.isArray(value)
			? value
			: [value];

const matchesIdentifier = (
	entry: MiddlewareIdentifier,
	target: MiddlewareIdentifier,
) =>
	(typeof entry === "string" && typeof target === "string" && entry === target) ||
	(typeof entry === "function" &&
		typeof target === "function" &&
		entry === target);

export class MiddlewareBuilder {
	global(
		middleware: MiddlewareList,
		options: MiddlewareRegistrationOptions = {},
	): this {
		registerGlobalMiddleware(middleware, options);

		return this;
	}

	web(config: GroupConfig = []): this {
		return this.configureGroup("web", config);
	}

	api(config: GroupConfig = []): this {
		return this.configureGroup("api", config);
	}

	group(name: string, config: GroupConfig = []): this {
		return this.configureGroup(name, config);
	}

	alias(
		nameOrAliases: string | Record<string, MiddlewareIdentifier>,
		middleware?: MiddlewareIdentifier,
	): this {
		if (typeof nameOrAliases === "string") {
			if (!middleware) {
				throw new Error(
					`Middleware alias "${nameOrAliases}" requires a middleware reference.`,
				);
			}

			registerMiddlewareAlias(nameOrAliases, middleware);
		} else {
			for (const [alias, identifier] of Object.entries(nameOrAliases)) {
				registerMiddlewareAlias(alias, identifier);
			}
		}

		return this;
	}

	encryptCookies(except: string[] = []): this {
		EncryptCookies.configure({ except });

		return this;
	}

	private configureGroup(name: string, config: GroupConfig): this {
		const options = this.normalizeGroupConfig(config);
		const current = MiddlewareConfig.groups[name] ?? [];
		let updated = options.set ? options.set.slice() : current.slice();

		if (options.remove.length) {
			updated = updated.filter(
				(entry) => !options.remove.some((target) => matchesIdentifier(entry, target)),
			);
		}

		if (options.prepend.length) {
			updated = [...options.prepend, ...updated];
		}

		if (options.append.length) {
			updated = [...updated, ...options.append];
		}

		MiddlewareConfig.groups[name] = updated;

		return this;
	}

	private normalizeGroupConfig(config: GroupConfig) {
		if (typeof config === "function" || typeof config === "string") {
			return {
				append: toArray(config),
				prepend: [] as MiddlewareIdentifier[],
				remove: [] as MiddlewareIdentifier[],
				set: undefined as MiddlewareIdentifier[] | undefined,
			};
		}

		if (Array.isArray(config)) {
			return {
				append: config,
				prepend: [] as MiddlewareIdentifier[],
				remove: [] as MiddlewareIdentifier[],
				set: undefined as MiddlewareIdentifier[] | undefined,
			};
		}

		return {
			append: toArray(config.append),
			prepend: toArray(config.prepend),
			remove: toArray(config.remove),
			set: config.set?.slice(),
		};
	}
}
