import type { HttpRequest } from "@core/Http/Request";
import {
	AlwaysProp,
	type Arrayable,
	BaseInertiaProp,
	DeferProp,
	type IgnoreFirstLoad,
	type InertiaPage,
	type InertiaProps,
	type InertiaPropValue,
	type InertiaRenderOptions,
	isArrayable,
	isInertiaProp,
	isMergeableProp,
	isProvidesInertiaProperties,
	isProvidesInertiaProperty,
	type Mergeable,
	type ProvidesInertiaProperties,
	type ProvidesInertiaProperty,
	type ScrollMetadataPayload,
	type ScrollOptions,
	ScrollProp,
} from "@core/Inertia/InertiaTypes";
import {
	getSharedData,
	INERTIA_SHARED_PROPS_ATTRIBUTE,
	type SharedDataPayload,
} from "@core/Inertia/SharedData";
import { AppShellRenderer } from "@core/View/AppShellRenderer";
import { ViteAssetTagGenerator } from "@core/Vite/AssetTagGenerator";

const HEADER = {
	INERTIA: "X-Inertia",
	VERSION: "X-Inertia-Version",
	LOCATION: "X-Inertia-Location",
	PARTIAL_COMPONENT: "X-Inertia-Partial-Component",
	PARTIAL_ONLY: "X-Inertia-Partial-Data",
	PARTIAL_EXCEPT: "X-Inertia-Partial-Except",
	INFINITE_SCROLL_MERGE_INTENT: "X-Inertia-Infinite-Scroll-Merge-Intent",
	RESET: "X-Inertia-Reset",
};

const PROVIDER_KEY_PREFIX = "__inertia_provider__";
const DEFAULT_DEFER_GROUP = "default";

type NormalizedProps = Record<
	string,
	InertiaPropValue | ProvidesInertiaProperties
>;

export type InertiaRenderableProps =
	| InertiaProps
	| Arrayable<InertiaProps>
	| ProvidesInertiaProperties;

interface ResolvedPagePayload {
	props: Record<string, unknown>;
	metadata: Partial<
		Pick<
			InertiaPage,
			| "mergeProps"
			| "prependProps"
			| "deepMergeProps"
			| "matchPropsOn"
			| "deferredProps"
			| "scrollProps"
		>
	>;
}

export class InertiaResponseFactory {
	private versionSource:
		| string
		| number
		| null
		| ((
				request?: HttpRequest,
		  ) => string | number | null | Promise<string | number | null>) = null;

	private encryptHistoryValue = false;
	private urlResolver:
		| ((request: HttpRequest) => string | Promise<string>)
		| null = null;

	constructor(
		private readonly assets = new ViteAssetTagGenerator(),
		private template = new AppShellRenderer(),
	) {}

	setRootView(path: string): void {
		this.template = new AppShellRenderer(path);
	}

	version(
		value:
			| string
			| number
			| null
			| ((
					request?: HttpRequest,
			  ) => string | number | null | Promise<string | number | null>),
	): void {
		this.versionSource = value;
	}

	async getVersion(request?: HttpRequest): Promise<string> {
		if (!this.versionSource) {
			return this.assets.getVersion();
		}

		if (typeof this.versionSource === "function") {
			const resolved = await this.versionSource(request);
			return resolved == null ? "" : String(resolved);
		}

		return this.versionSource == null ? "" : String(this.versionSource);
	}

	resolveUrlUsing(
		resolver?: (request: HttpRequest) => string | Promise<string>,
	): void {
		this.urlResolver = resolver ?? null;
	}

	encryptHistory(encrypt = true): void {
		this.encryptHistoryValue = encrypt;
	}

	async render(
		request: HttpRequest,
		component: string,
		props: InertiaRenderableProps | null = null,
		options: InertiaRenderOptions = {},
	): Promise<Response> {
		const sharedPayload =
			request.getAttribute<SharedDataPayload>(INERTIA_SHARED_PROPS_ATTRIBUTE) ??
			getSharedData();

		const normalizedProps = this.normalizeProps(props);

		const rawProps = this.mergeProps(sharedPayload, normalizedProps);
		const version = options.version ?? (await this.getVersion(request));
		const clientVersion = request.header(HEADER.VERSION);
		const url = await this.resolveUrl(request);

		if (clientVersion && clientVersion !== version) {
			return new Response(null, {
				status: 409,
				headers: { [HEADER.LOCATION]: url },
			});
		}

		const resolved = await this.resolveProperties(request, component, rawProps);

		const page: InertiaPage = {
			component,
			props: resolved.props,
			url,
			version,
			clearHistory: this.consumeClearHistoryFlag(request),
			encryptHistory: this.encryptHistoryValue,
			...resolved.metadata,
		};

		if (this.isInertiaRequest(request)) {
			return this.makeJsonResponse(page, options);
		}

		const html = await this.template.render(
			page,
			await this.assets.generateTags(),
		);

		return new Response(html, {
			status: options.status ?? 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				...(options.headers ?? {}),
			},
		});
	}

	private normalizeProps(
		props: InertiaRenderableProps | null,
	): SharedDataPayload {
		if (!props) {
			return { values: {}, providers: [] };
		}

		if (isProvidesInertiaProperties(props)) {
			return { values: {}, providers: [props] };
		}

		if (isArrayable(props)) {
			return { values: props.toArray(), providers: [] };
		}

		return { values: props, providers: [] };
	}

	private mergeProps(
		shared: SharedDataPayload,
		local: SharedDataPayload,
	): NormalizedProps {
		const merged: NormalizedProps = {};
		let providerIndex = 0;

		const assign = (payload: SharedDataPayload) => {
			Object.assign(merged, payload.values);
			payload.providers.forEach((provider) => {
				merged[`${PROVIDER_KEY_PREFIX}${providerIndex++}`] = provider;
			});
		};

		assign(shared);
		assign(local);

		return merged;
	}

	private async resolveProperties(
		request: HttpRequest,
		component: string,
		rawProps: NormalizedProps,
	): Promise<ResolvedPagePayload> {
		const propsWithProviders = await this.resolveInertiaPropsProviders(
			request,
			component,
			rawProps,
		);
		const filteredProps = this.resolvePartialProperties(
			request,
			component,
			propsWithProviders,
		);
		const arrayableProps = await this.resolveArrayableProperties(
			filteredProps,
			request,
		);
		const withAlways = this.resolveAlways(rawProps, arrayableProps);
		const props = await this.resolvePropertyInstances(withAlways, request);

		return {
			props,
			metadata: {
				...this.resolveMergeProps(request, rawProps),
				...this.resolveDeferredProps(request, component, rawProps),
				...this.resolveScrollProps(request, rawProps),
			},
		};
	}

	private async resolveInertiaPropsProviders(
		request: HttpRequest,
		component: string,
		props: NormalizedProps,
	): Promise<Record<string, InertiaPropValue>> {
		const resolved: Record<string, InertiaPropValue> = {};

		for (const [key, value] of Object.entries(props)) {
			if (isProvidesInertiaProperties(value)) {
				const provided = await value.toInertiaProperties({
					component,
					request,
				});
				Object.assign(resolved, provided);
				continue;
			}

			resolved[key] = value;
		}

		return resolved;
	}

	private resolvePartialProperties(
		request: HttpRequest,
		component: string,
		props: Record<string, InertiaPropValue>,
	): Record<string, InertiaPropValue> {
		const isPartial = this.isPartialRequest(request, component);

		if (!isPartial) {
			return Object.fromEntries(
				Object.entries(props).filter(
					([, value]) => !isIgnoreFirstLoadProp(value),
				),
			);
		}

		const only = parseHeaderList(request.header(HEADER.PARTIAL_ONLY));
		const except = parseHeaderList(request.header(HEADER.PARTIAL_EXCEPT));

		let filtered = props;

		if (only.length) {
			const subset: Record<string, InertiaPropValue> = {};

			for (const key of only) {
				const value = getByPath(filtered, key);
				if (typeof value !== "undefined") {
					setByPath(subset, key, value as InertiaPropValue);
				}
			}

			filtered = subset;
		}

		if (except.length) {
			except.forEach((key) => forgetByPath(filtered, key));
		}

		return filtered;
	}

	private async resolveArrayableProperties(
		props: Record<string, InertiaPropValue>,
		request: HttpRequest,
		unpackDotProps = true,
	): Promise<Record<string, InertiaPropValue>> {
		const resolved: Record<string, InertiaPropValue> = { ...props };

		for (const [key, value] of Object.entries(resolved)) {
			let current: unknown = value;

			if (typeof current === "function" && !isInertiaProp(current)) {
				current = await (current as (request: HttpRequest) => Promise<unknown>)(
					request,
				);
			}

			if (isArrayable(current)) {
				current = current.toArray();
			}

			if (isPlainObject(current)) {
				current = await this.resolveArrayableProperties(
					current as Record<string, InertiaPropValue>,
					request,
					false,
				);
			} else if (Array.isArray(current)) {
				current = await Promise.all(
					current.map((item) => this.resolveArrayEntry(item, request)),
				);
			}

			if (unpackDotProps && key.includes(".")) {
				setByPath(resolved, key, current as InertiaPropValue);
				delete resolved[key];
			} else {
				resolved[key] = current as InertiaPropValue;
			}
		}

		return resolved;
	}

	private async resolveArrayEntry(
		value: unknown,
		request: HttpRequest,
	): Promise<unknown> {
		let current = value;

		if (isInertiaProp(current)) {
			return current.resolve(request);
		}

		if (typeof current === "function") {
			current = await (current as (request: HttpRequest) => unknown)(request);
		}

		if (isArrayable(current)) {
			current = current.toArray();
		}

		if (Array.isArray(current)) {
			return Promise.all(
				current.map((entry) => this.resolveArrayEntry(entry, request)),
			);
		}

		if (isPlainObject(current)) {
			return this.resolveArrayableProperties(
				current as Record<string, InertiaPropValue>,
				request,
				false,
			);
		}

		return current;
	}

	private resolveAlways(
		rawProps: NormalizedProps,
		props: Record<string, InertiaPropValue>,
	): Record<string, InertiaPropValue> {
		const always = Object.fromEntries(
			Object.entries(rawProps).filter(
				([, value]) => value instanceof AlwaysProp,
			),
		) as Record<string, AlwaysProp>;

		if (!Object.keys(always).length) {
			return props;
		}

		return { ...always, ...props };
	}

	private async resolvePropertyInstances(
		props: Record<string, InertiaPropValue>,
		request: HttpRequest,
		parentKey?: string,
	): Promise<Record<string, unknown>> {
		const resolved: Record<string, unknown> = {};

		for (const [key, rawValue] of Object.entries(props)) {
			const currentKey = parentKey ? `${parentKey}.${key}` : key;
			let value: unknown = rawValue;

			if (value instanceof ScrollProp) {
				value.configureMergeIntent(request);
			}

			if (isInertiaProp(value)) {
				value = await value.resolve(request);
			}

			if (typeof value === "function") {
				value = await (value as (request: HttpRequest) => unknown)(request);
			}

			if (isProvidesInertiaProperty(value)) {
				value = await value.toInertiaProperty({
					key: currentKey,
					props,
					request,
				});
			}

			if (isArrayable(value)) {
				value = value.toArray();
			}

			if (value instanceof BaseInertiaProp) {
				value = await value.resolve(request);
			}

			if (value instanceof Response) {
				resolved[key] = value;
				continue;
			}

			if (value instanceof ScrollProp) {
				value = await value.resolve(request);
			}

			if (value instanceof Promise) {
				value = await value;
			}

			if (Array.isArray(value)) {
				value = await Promise.all(
					value.map((entry, index) =>
						this.resolveNestedValue(
							entry,
							request,
							`${currentKey}.${index}`,
							props,
						),
					),
				);
			} else if (isPlainObject(value)) {
				value = await this.resolvePropertyInstances(
					value as Record<string, InertiaPropValue>,
					request,
					currentKey,
				);
			}

			resolved[key] = value;
		}

		return resolved;
	}

	private async resolveNestedValue(
		value: unknown,
		request: HttpRequest,
		key: string,
		props: Record<string, InertiaPropValue>,
	): Promise<unknown> {
		if (isInertiaProp(value)) {
			return value.resolve(request);
		}

		if (typeof value === "function") {
			return (value as (request: HttpRequest) => unknown)(request);
		}

		if (isProvidesInertiaProperty(value)) {
			return value.toInertiaProperty({ key, props, request });
		}

		if (isArrayable(value)) {
			value = value.toArray();
		}

		if (value instanceof Promise) {
			value = await value;
		}

		if (Array.isArray(value)) {
			return Promise.all(
				value.map((entry, index) =>
					this.resolveNestedValue(entry, request, `${key}.${index}`, props),
				),
			);
		}

		if (isPlainObject(value)) {
			return this.resolvePropertyInstances(
				value as Record<string, InertiaPropValue>,
				request,
				key,
			);
		}

		return value;
	}

	private resolveMergeProps(
		request: HttpRequest,
		rawProps: NormalizedProps,
	): Partial<
		Pick<
			InertiaPage,
			"mergeProps" | "prependProps" | "deepMergeProps" | "matchPropsOn"
		>
	> {
		const mergeProps = this.getMergePropsForRequest(request, rawProps);

		const append = this.resolveAppendMergeProps(mergeProps);
		const prepend = this.resolvePrependMergeProps(mergeProps);
		const deep = this.resolveDeepMergeProps(mergeProps);
		const match = this.resolveMergeMatchingKeys(mergeProps);

		const payload: Partial<
			Pick<
				InertiaPage,
				"mergeProps" | "prependProps" | "deepMergeProps" | "matchPropsOn"
			>
		> = {};

		if (append.length) {
			payload.mergeProps = append;
		}

		if (prepend.length) {
			payload.prependProps = prepend;
		}

		if (deep.length) {
			payload.deepMergeProps = deep;
		}

		if (match.length) {
			payload.matchPropsOn = match;
		}

		return payload;
	}

	private resolveDeferredProps(
		request: HttpRequest,
		component: string,
		rawProps: NormalizedProps,
	): Partial<Pick<InertiaPage, "deferredProps">> {
		if (this.isPartialRequest(request, component)) {
			return {};
		}

		const grouped = new Map<string, string[]>();

		for (const [key, value] of Object.entries(rawProps)) {
			if (!(value instanceof DeferProp)) {
				continue;
			}

			const group = value.group() ?? DEFAULT_DEFER_GROUP;
			const existing = grouped.get(group) ?? [];
			grouped.set(group, [...existing, key]);
		}

		if (!grouped.size) {
			return {};
		}

		return {
			deferredProps: Object.fromEntries(grouped.entries()),
		};
	}

	private resolveScrollProps(
		request: HttpRequest,
		rawProps: NormalizedProps,
	): Partial<Pick<InertiaPage, "scrollProps">> {
		const resetProps = this.getResetProps(request);

		const mergeable = this.getMergePropsForRequest(request, rawProps, false);
		const scrollEntries = mergeable.filter(
			([, prop]) => prop instanceof ScrollProp,
		) as Array<[string, ScrollProp]>;

		if (!scrollEntries.length) {
			return {};
		}

		const scrollProps = Object.fromEntries(
			scrollEntries.map(([key, prop]) => [
				key,
				{
					...prop.metadata(),
					reset: resetProps.includes(key),
				} satisfies ScrollMetadataPayload,
			]),
		);

		return { scrollProps };
	}

	private getMergePropsForRequest(
		request: HttpRequest,
		rawProps: NormalizedProps,
		rejectResetProps = true,
	): Array<[string, Mergeable]> {
		const resetProps = rejectResetProps ? this.getResetProps(request) : [];
		const only = parseHeaderList(request.header(HEADER.PARTIAL_ONLY));
		const except = parseHeaderList(request.header(HEADER.PARTIAL_EXCEPT));

		return Object.entries(rawProps)
			.filter(
				(
					entry,
				): entry is [string, BaseInertiaProp & { shouldMerge(): boolean }] =>
					isMergeableProp(entry[1]) && entry[1].shouldMerge(),
			)
			.filter(([key]) => !resetProps.includes(key))
			.filter(([key]) => only.length === 0 || only.includes(key))
			.filter(([key]) => !except.includes(key));
	}

	private resolveAppendMergeProps(
		mergeProps: Array<[string, Mergeable]>,
	): string[] {
		const filtered = mergeProps.filter(([, prop]) => !prop.shouldDeepMerge());

		const nested = filtered.flatMap(([key, prop]) =>
			prop.appendsAtPaths().map((path) => `${key}.${path}`),
		);

		const root = filtered
			.filter(([, prop]) => prop.appendsAtRoot())
			.map(([key]) => key);

		return Array.from(new Set([...nested, ...root]));
	}

	private resolvePrependMergeProps(
		mergeProps: Array<[string, Mergeable]>,
	): string[] {
		const filtered = mergeProps.filter(([, prop]) => !prop.shouldDeepMerge());

		const nested = filtered.flatMap(([key, prop]) =>
			prop.prependsAtPaths().map((path) => `${key}.${path}`),
		);

		const root = filtered
			.filter(([, prop]) => prop.prependsAtRoot())
			.map(([key]) => key);

		return Array.from(new Set([...nested, ...root]));
	}

	private resolveDeepMergeProps(
		mergeProps: Array<[string, Mergeable]>,
	): string[] {
		return mergeProps
			.filter(([, prop]) => prop.shouldDeepMerge())
			.map(([key]) => key);
	}

	private resolveMergeMatchingKeys(
		mergeProps: Array<[string, Mergeable]>,
	): string[] {
		return mergeProps
			.flatMap(([key, prop]) =>
				prop.matchesOn().map((match) => `${key}.${match}`),
			)
			.filter((value, index, array) => array.indexOf(value) === index);
	}

	private getResetProps(request: HttpRequest): string[] {
		return parseHeaderList(request.header(HEADER.RESET));
	}

	private isInertiaRequest(request: HttpRequest): boolean {
		return request.header(HEADER.INERTIA) === "true";
	}

	private isPartialRequest(request: HttpRequest, component: string): boolean {
		return request.header(HEADER.PARTIAL_COMPONENT) === component;
	}

	private consumeClearHistoryFlag(request: HttpRequest): boolean {
		const session = request.session();
		if (!session) {
			return false;
		}

		const shouldClear = Boolean(session.get("inertia.clear_history"));
		if (shouldClear) {
			session.forget("inertia.clear_history");
		}

		return shouldClear;
	}

	private async resolveUrl(request: HttpRequest): Promise<string> {
		if (this.urlResolver) {
			return this.urlResolver(request);
		}

		const url = request.urlInstance;
		const pathname = url.pathname.startsWith("/")
			? url.pathname
			: `/${url.pathname}`;
		const base = `${pathname}${url.search}`;
		return request.urlInstance.pathname.endsWith("/")
			? finishUrlWithTrailingSlash(base)
			: base || "/";
	}

	private makeJsonResponse(
		page: InertiaPage,
		options: InertiaRenderOptions,
	): Response {
		return new Response(JSON.stringify(page), {
			status: options.status ?? 200,
			headers: {
				"Content-Type": "application/json",
				Vary: "Accept",
				[HEADER.INERTIA]: "true",
				...(options.headers ?? {}),
			},
		});
	}
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseHeaderList = (value: string | null): string[] => {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
};

const setByPath = (
	target: Record<string, unknown>,
	path: string,
	value: unknown,
) => {
	const segments = path.split(".");
	let current: Record<string, unknown> = target;

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]!;
		if (i === segments.length - 1) {
			current[segment] = value;
			return;
		}

		if (!isPlainObject(current[segment])) {
			current[segment] = {};
		}

		current = current[segment] as Record<string, unknown>;
	}
};

const getByPath = (target: Record<string, unknown>, path: string): unknown => {
	const segments = path.split(".");
	let current: unknown = target;

	for (const segment of segments) {
		if (
			!current ||
			typeof current !== "object" ||
			!(segment in (current as Record<string, unknown>))
		) {
			return undefined;
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return current;
};

const forgetByPath = (target: Record<string, unknown>, path: string): void => {
	const segments = path.split(".");
	const stack: Array<{ parent: Record<string, unknown>; key: string }> = [];
	let current: Record<string, unknown> | undefined = target;

	for (const segment of segments) {
		if (!current || typeof current !== "object") {
			return;
		}

		stack.push({ parent: current, key: segment });
		current = current[segment] as Record<string, unknown>;
	}

	const last = stack.pop();
	if (last) {
		delete last.parent[last.key];
	}
};

const finishUrlWithTrailingSlash = (url: string): string => {
	if (url.endsWith("/")) {
		return url;
	}

	const [path, query] = url.split("?");
	const base = path.endsWith("/") ? path : `${path}/`;
	return query ? `${base}?${query}` : base;
};

const isIgnoreFirstLoadProp = (value: unknown): value is IgnoreFirstLoad => {
	return Boolean(
		value &&
			typeof value === "object" &&
			"ignoreFirstLoad" in value &&
			(value as IgnoreFirstLoad).ignoreFirstLoad === true,
	);
};

export const inertiaResponseFactory = new InertiaResponseFactory();
