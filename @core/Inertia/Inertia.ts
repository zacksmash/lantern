import { RequestContext } from "@core/Application/RequestContext";
import type { HttpRequest } from "@core/Http/Request";
import {
	AlwaysProp,
	DeferProp,
	LazyProp,
	MergeProp,
	OptionalProp,
	type InertiaProps,
	type InertiaPropValue,
	type InertiaRenderOptions,
	type PropValue,
	type ScrollOptions,
	ScrollMetadata,
	ScrollProp,
} from "@core/Inertia/InertiaTypes";
import {
	flushShared as flushSharedStore,
	getSharedData,
	share as storeSharedData,
	type SharedDataPayload,
} from "@core/Inertia/SharedData";
import type { ProvidesInertiaProperties } from "@core/Inertia/InertiaTypes";
import {
	inertiaResponseFactory,
	type InertiaRenderableProps,
	type InertiaResponseFactory,
} from "@core/Inertia/InertiaResponseFactory";

type SharedValues = SharedDataPayload["values"];

export const inertia = (
	component: string,
	props: InertiaRenderableProps | null = null,
	options?: InertiaRenderOptions,
): Promise<Response> => {
	const request = getRequestOrFail();
	return inertiaResponseFactory.render(request, component, props, options);
};

export const makeInertia = (
	factory: InertiaResponseFactory,
	request: HttpRequest,
	component: string,
	props: InertiaRenderableProps | null = null,
	options?: InertiaRenderOptions,
) => {
	return factory.render(request, component, props, options);
};

export function share(values: Record<string, InertiaPropValue>): void;
export function share(
	provider: ProvidesInertiaProperties,
): void;
export function share(key: string, value: InertiaPropValue): void;
export function share(
	keyOrValues:
		| string
		| Record<string, InertiaPropValue>
		| ProvidesInertiaProperties,
	value?: InertiaPropValue,
): void {
	if (typeof keyOrValues === "string") {
		storeSharedData(keyOrValues, value as InertiaPropValue);
		return;
	}

	storeSharedData(keyOrValues);
}

export const getShared = (
	key?: string,
	fallback?: InertiaPropValue,
): SharedValues | InertiaPropValue | undefined => {
	const shared = getSharedData().values;
	if (typeof key === "string") {
		return (shared[key] ?? fallback) as InertiaPropValue | undefined;
	}

	return shared;
};

export const flushShared = () => {
	flushSharedStore();
};

export const setRootView = (view: string) => {
	inertiaResponseFactory.setRootView(view);
};

export const version = (
	value:
		| string
		| number
		| null
		| ((
				request?: HttpRequest,
			) => string | number | null | Promise<string | number | null>),
) => {
	inertiaResponseFactory.version(value);
};

export const getVersion = () => inertiaResponseFactory.getVersion();

export const resolveUrlUsing = (
	resolver?: (request: HttpRequest) => string | Promise<string>,
) => {
	inertiaResponseFactory.resolveUrlUsing(resolver);
};

export const clearHistory = () => {
	const request = getRequestOrFail();
	request.session()?.put("inertia.clear_history", true);
};

export const encryptHistory = (encrypt = true) => {
	inertiaResponseFactory.encryptHistory(encrypt);
};

export const optional = <TValue = unknown>(value: PropValue<TValue>) =>
	new OptionalProp(value);

export const lazy = <TValue = unknown>(value: PropValue<TValue>) =>
	new LazyProp(value);

export const defer = <TValue = unknown>(
	value: PropValue<TValue>,
	options?: { group?: string | null },
) => new DeferProp(value, options?.group ?? null);

export const always = <TValue = unknown>(value: PropValue<TValue>) =>
	new AlwaysProp(value);

export const shareAlways = (key: string, value: PropValue<unknown>) => {
	share(key, always(value));
};

export const merge = <TValue = unknown>(value: PropValue<TValue>) =>
	new MergeProp(value);

export const deepMerge = <TValue = unknown>(value: PropValue<TValue>) =>
	new MergeProp(value).deepMerge();

export const scroll = <TValue = unknown>(
	value: PropValue<TValue>,
	options: ScrollOptions<TValue> = {},
) => {
	const metadata =
		options.metadata ??
		(options.pageName ||
		typeof options.currentPage !== "undefined" ||
		typeof options.previousPage !== "undefined" ||
		typeof options.nextPage !== "undefined"
			? ScrollMetadata.manual({
					pageName: options.pageName,
					currentPage: options.currentPage ?? null,
					previousPage: options.previousPage ?? null,
					nextPage: options.nextPage ?? null,
				})
			: undefined);

	const prop = new ScrollProp(value, options.wrapper ?? "data", metadata);

	if (options.match) {
		prop.matchOn(options.match);
	}

	return prop;
};

export const location = (target: string | URL): Response => {
	const request = getRequestOrFail();
	const url = typeof target === "string" ? target : target.toString();

	if (request.header("X-Inertia") === "true") {
		return new Response(null, {
			status: 409,
			headers: { "X-Inertia-Location": url },
		});
	}

	return Response.redirect(url);
};

const getRequestOrFail = (): HttpRequest => {
	const request = RequestContext.get();
	if (!request) {
		throw new Error(
			"Inertia responses require an active HttpRequest. Are you running inside a request lifecycle?",
		);
	}

	return request;
};
