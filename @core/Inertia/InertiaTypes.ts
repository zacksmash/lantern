import type { HttpRequest } from "@core/Http/Request";

export type PropResolver<TValue = unknown> = (
	request: HttpRequest,
) => TValue | Promise<TValue>;

export type InertiaPropValue = unknown | PropResolver | WrappedInertiaProp;

export type InertiaProps = Record<string, InertiaPropValue>;

export interface InertiaPage {
	component: string;
	props: Record<string, unknown>;
	url: string;
	version: string;
	mergeProps?: string[];
	prependProps?: string[];
	deepMergeProps?: string[];
	matchPropsOn?: string[];
	deferredProps?: Record<string, string[]>;
	scrollProps?: Record<string, ScrollProp>;
}

export interface InertiaRenderOptions {
	status?: number;
	headers?: Record<string, string>;
	version?: string;
}

export type MergeStrategy = "append" | "prepend" | "deep";

export interface ScrollProp {
	pageName: string;
	previousPage: number | string | null;
	nextPage: number | string | null;
	currentPage: number | string | null;
	reset: boolean;
}

export interface ScrollOptions extends Partial<ScrollProp> {
	match?: string | string[];
}

export const INERTIA_PROP_SYMBOL = Symbol("InertiaProp");

export interface WrappedInertiaProp {
	[INERTIA_PROP_SYMBOL]: PropDescriptor;
}

export interface DefaultDescriptor {
	kind: "value";
	resolver: PropResolver;
}

export interface OptionalDescriptor {
	kind: "optional";
	resolver: PropResolver;
	group?: string;
}

export interface AlwaysDescriptor {
	kind: "always";
	resolver: PropResolver;
}

export interface DeferredDescriptor {
	kind: "deferred";
	resolver: PropResolver;
	group?: string;
	only?: string[];
}

export interface MergeDescriptor {
	kind: "merge";
	resolver: PropResolver;
	strategy: MergeStrategy;
	match?: string[];
	path?: string;
}

export interface ScrollDescriptor {
	kind: "scroll";
	resolver: PropResolver;
	options?: ScrollOptions;
	match?: string[];
}

export type PropDescriptor =
	| DefaultDescriptor
	| OptionalDescriptor
	| AlwaysDescriptor
	| DeferredDescriptor
	| MergeDescriptor
	| ScrollDescriptor;

export const wrapPropDescriptor = (
	descriptor: PropDescriptor,
): WrappedInertiaProp => ({
	[INERTIA_PROP_SYMBOL]: descriptor,
});

export const isWrappedProp = (
	value: InertiaPropValue,
): value is WrappedInertiaProp => {
	return Boolean(
		value &&
			typeof value === "object" &&
			INERTIA_PROP_SYMBOL in (value as Record<symbol, unknown>),
	);
};

export const ensureResolver = (value: unknown | PropResolver): PropResolver => {
	if (typeof value === "function") {
		return value as PropResolver;
	}

	return () => value;
};
