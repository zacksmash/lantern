import { RequestContext } from "@core/Application/RequestContext";
import type { HttpRequest } from "@core/Http/Request";
import {
	type InertiaResponseFactory,
	inertiaResponseFactory,
} from "@core/Inertia/InertiaResponseFactory";
import type {
	InertiaProps,
	InertiaRenderOptions,
	MergeStrategy,
	PropDescriptor,
	PropResolver,
	ScrollOptions,
} from "@core/Inertia/InertiaTypes";
import { ensureResolver, wrapPropDescriptor } from "@core/Inertia/InertiaTypes";

export const inertia = (
	component: string,
	props: InertiaProps = {},
	options?: InertiaRenderOptions,
): Promise<Response> => {
	const request = getRequestOrFail();
	return inertiaResponseFactory.render(request, component, props, options);
};

export const makeInertia = (
	factory: InertiaResponseFactory,
	request: HttpRequest,
	component: string,
	props: InertiaProps = {},
	options?: InertiaRenderOptions,
) => {
	return factory.render(request, component, props, options);
};

type PropInput = PropResolver | any;

const wrap = (descriptor: PropDescriptor) => wrapPropDescriptor(descriptor);

export const optional = (resolver: PropInput, options?: { group?: string }) =>
	wrap({
		kind: "optional",
		resolver: ensureResolver(resolver),
		group: options?.group,
	});

export const always = (resolver: PropInput) =>
	wrap({
		kind: "always",
		resolver: ensureResolver(resolver),
	});

export const defer = (
	resolver: PropInput,
	options?: { group?: string; only?: string[] },
) =>
	wrap({
		kind: "deferred",
		resolver: ensureResolver(resolver),
		group: options?.group,
		only: options?.only,
	});

export const merge = (
	resolver: PropInput,
	options?: {
		strategy?: MergeStrategy;
		match?: string | string[];
		path?: string;
	},
) =>
	wrap({
		kind: "merge",
		resolver: ensureResolver(resolver),
		strategy: options?.strategy ?? "append",
		match: normalizeMatch(options?.match),
		path: options?.path,
	});

export const scroll = (resolver: PropInput, options: ScrollOptions = {}) => {
	const { match, ...rest } = options;
	return wrap({
		kind: "scroll",
		resolver: ensureResolver(resolver),
		options: rest,
		match: normalizeMatch(match),
	});
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

const normalizeMatch = (value?: string | string[]): string[] | undefined => {
	if (!value) return undefined;
	return Array.isArray(value) ? value : [value];
};
