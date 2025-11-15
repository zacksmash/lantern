import type { Router } from "@core/Routing/Router";

type ParameterValue = string | number | boolean | null | undefined;
export type RouteParameters = Record<string, ParameterValue | ParameterValue[]>;

export class UrlGenerator {
	constructor(
		private router: Router,
		private baseUrl?: string | null,
	) {}

	route(
		name: string,
		parameters: RouteParameters = {},
		absolute: boolean = true,
	): string {
		const template = this.router.getUriByName(name);
		if (!template) {
			throw new Error(`Route "${name}" is not defined.`);
		}

		const compiled = this.compileUri(template, { ...parameters });
		const base = absolute ? this.getBaseUrl().replace(/\/+$/, "") : "";
		const path = compiled.path === "" ? "/" : compiled.path;
		const query = compiled.query ? `?${compiled.query}` : "";
		return `${base}${path}${query}`;
	}

	private compileUri(template: string, parameters: RouteParameters) {
		const used = new Set<string>();

		let path = template.replace(/\/\{([^}]+)\?\}/g, (_match, key: string) => {
			const value = parameters[key];
			if (value === undefined || value === null || value === "") {
				return "";
			}
			const normalized = this.normalizeSegmentValue(key, value);
			used.add(key);
			return `/${this.encodeURIComponent(normalized)}`;
		});

		path = path.replace(/\{([^}?]+)\}/g, (_match, key: string) => {
			const value = parameters[key];
			if (value === undefined || value === null || value === "") {
				throw new Error(`Missing required parameter "${key}".`);
			}
			const normalized = this.normalizeSegmentValue(key, value);
			used.add(key);
			return this.encodeURIComponent(normalized);
		});

		path = path.replace(/\/{2,}/g, "/");
		if (path.length > 1 && path.endsWith("/")) {
			path = path.replace(/\/+$/, "");
		}

		const query = this.buildQueryString(parameters, used);

		return { path, query };
	}

	private buildQueryString(
		parameters: RouteParameters,
		used: Set<string>,
	): string {
		const query = new URLSearchParams();

		for (const [key, value] of Object.entries(parameters)) {
			if (used.has(key) || value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				for (const entry of value) {
					if (entry === undefined || entry === null) continue;
					query.append(key, String(entry));
				}
			} else {
				query.append(key, String(value));
			}
		}

		return query.toString();
	}

	private encodeURIComponent(value: ParameterValue) {
		return encodeURIComponent(String(value));
	}

	private normalizeSegmentValue(
		key: string,
		value: ParameterValue | ParameterValue[],
	): ParameterValue {
		if (Array.isArray(value)) {
			if (value.length === 0) {
				throw new Error(`Missing required parameter "${key}".`);
			}

			const [first] = value;
			if (first === undefined || first === null || first === "") {
				throw new Error(`Missing required parameter "${key}".`);
			}

			return first;
		}

		return value;
	}

	private getBaseUrl(): string {
		if (this.baseUrl) {
			return this.baseUrl;
		}

		if (typeof globalThis.env === "function") {
			return globalThis.env("APP_URL", "http://localhost:3000");
		}

		return "http://localhost:3000";
	}
}
