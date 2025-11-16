import type { HttpRequest } from "@core/Http/Request";

export type MaybePromise<T> = T | Promise<T>;

export type PropResolver<TValue = unknown> = (
	request: HttpRequest,
) => MaybePromise<TValue>;

export type PropValue<TValue = unknown> =
	| TValue
	| MaybePromise<TValue>
	| PropResolver<TValue>;

export interface Arrayable<TValue = Record<string, unknown>> {
	toArray(): TValue;
}

export interface RenderContext {
	component: string;
	request: HttpRequest;
}

export interface PropertyContext {
	key: string;
	props: Record<string, unknown>;
	request: HttpRequest;
}

export interface ProvidesInertiaProperties {
	toInertiaProperties(context: RenderContext): MaybePromise<
		Record<string, InertiaPropValue>
	>;
}

export interface ProvidesInertiaProperty {
	toInertiaProperty(context: PropertyContext): MaybePromise<unknown>;
}

export interface ProvidesScrollMetadata {
	getPageName(): string;
	getPreviousPage(): number | string | null;
	getNextPage(): number | string | null;
	getCurrentPage(): number | string | null;
}

export interface IgnoreFirstLoad {
	readonly ignoreFirstLoad: true;
}

export interface Mergeable {
	merge(): this;
	deepMerge(): this;
	matchOn(matchOn: string | string[]): this;
	shouldMerge(): boolean;
	shouldDeepMerge(): boolean;
	matchesOn(): string[];
	appendsAtRoot(): boolean;
	prependsAtRoot(): boolean;
	appendsAtPaths(): string[];
	prependsAtPaths(): string[];
	append(
		path?: boolean | string | string[] | Record<string, string>,
		matchOn?: string,
	): this;
	prepend(
		path?: boolean | string | string[] | Record<string, string>,
		matchOn?: string,
	): this;
}

export type InertiaPropValue =
	| unknown
	| PropValue
	| BaseInertiaProp
	| ProvidesInertiaProperty;

export type InertiaProps = Record<string, InertiaPropValue>;

export interface InertiaPage {
	component: string;
	props: Record<string, unknown>;
	url: string;
	version: string;
	clearHistory?: boolean;
	encryptHistory?: boolean;
	mergeProps?: string[];
	prependProps?: string[];
	deepMergeProps?: string[];
	matchPropsOn?: string[];
	deferredProps?: Record<string, string[]>;
	scrollProps?: Record<string, ScrollMetadataPayload>;
	cache?: number[];
}

export interface InertiaRenderOptions {
	status?: number;
	headers?: Record<string, string>;
	version?: string;
}

export interface ScrollMetadataPayload {
	pageName: string;
	previousPage: number | string | null;
	nextPage: number | string | null;
	currentPage: number | string | null;
	reset?: boolean;
}

export interface ScrollOptions<TValue = unknown> {
	wrapper?: string;
	match?: string | string[];
	metadata?:
		| ProvidesScrollMetadata
		| ((value: TValue) => ProvidesScrollMetadata);
	pageName?: string;
	previousPage?: number | string | null;
	nextPage?: number | string | null;
	currentPage?: number | string | null;
}

const toResolver = <TValue>(value: PropValue<TValue>): PropResolver<TValue> => {
	if (typeof value === "function") {
		return (request: HttpRequest) =>
			(value as PropResolver<TValue> | (() => MaybePromise<TValue>))(request);
	}

	return () => value as TValue;
};

export abstract class BaseInertiaProp<TValue = unknown> {
	protected constructor(private readonly resolver: PropResolver<TValue>) {}

	async resolve(request: HttpRequest): Promise<TValue> {
		return this.resolver(request);
	}
}

class MergeConfiguration {
	private merge = false;
	private deepMerge = false;
	private append = true;
	private matchOn: string[] = [];
	private appendPaths: string[] = [];
	private prependPaths: string[] = [];

	enableMerge(): void {
		this.merge = true;
	}

	enableDeepMerge(): void {
		this.merge = true;
		this.deepMerge = true;
	}

	setAppendFlag(value: boolean): void {
		this.append = value;
	}

	addAppendPath(path: string): void {
		if (!this.appendPaths.includes(path)) {
			this.appendPaths.push(path);
		}
	}

	addPrependPath(path: string): void {
		if (!this.prependPaths.includes(path)) {
			this.prependPaths.push(path);
		}
	}

	addMatchOn(value: string | string[]): void {
		const entries = Array.isArray(value) ? value : [value];
		for (const entry of entries) {
			if (!this.matchOn.includes(entry)) {
				this.matchOn.push(entry);
			}
		}
	}

	appendsAtRoot(): boolean {
		return this.append && this.appendPaths.length === 0 && this.prependPaths.length === 0;
	}

	prependsAtRoot(): boolean {
		return !this.append && this.appendPaths.length === 0 && this.prependPaths.length === 0;
	}

	appendsAtPaths(): string[] {
		return this.appendPaths.slice();
	}

	prependsAtPaths(): string[] {
		return this.prependPaths.slice();
	}

	shouldMerge(): boolean {
		return this.merge;
	}

	shouldDeepMerge(): boolean {
		return this.deepMerge;
	}

	matchesOn(): string[] {
		return this.matchOn.slice();
	}
}

abstract class MergeableProp<TValue = unknown>
	extends BaseInertiaProp<TValue>
	implements Mergeable
{
	protected readonly config = new MergeConfiguration();

	merge(): this {
		this.config.enableMerge();
		return this;
	}

	deepMerge(): this {
		this.config.enableDeepMerge();
		return this;
	}

	matchOn(matchOn: string | string[]): this {
		this.config.addMatchOn(matchOn);
		return this;
	}

	shouldMerge(): boolean {
		return this.config.shouldMerge();
	}

	shouldDeepMerge(): boolean {
		return this.config.shouldDeepMerge();
	}

	matchesOn(): string[] {
		return this.config.matchesOn();
	}

	appendsAtRoot(): boolean {
		return this.config.appendsAtRoot();
	}

	prependsAtRoot(): boolean {
		return this.config.prependsAtRoot();
	}

	appendsAtPaths(): string[] {
		return this.config.appendsAtPaths();
	}

	prependsAtPaths(): string[] {
		return this.config.prependsAtPaths();
	}

	append(
		path: boolean | string | string[] | Record<string, string> = true,
		matchOn?: string,
	): this {
		if (typeof path === "boolean") {
			this.config.setAppendFlag(path);
			return this;
		}

		if (typeof path === "string") {
			this.config.addAppendPath(path);
			if (matchOn) {
				this.matchOn(`${path}.${matchOn}`);
			}
			return this;
		}

		if (Array.isArray(path)) {
			path.forEach((entry) => this.append(entry));
			return this;
		}

		Object.entries(path).forEach(([key, value]) => {
			if (typeof value === "string") {
				this.append(key, value);
			} else {
				this.append(key);
			}
		});

		return this;
	}

	prepend(
		path: boolean | string | string[] | Record<string, string> = true,
		matchOn?: string,
	): this {
		if (typeof path === "boolean") {
			this.config.setAppendFlag(!path);
			return this;
		}

		if (typeof path === "string") {
			this.config.addPrependPath(path);
			if (matchOn) {
				this.matchOn(`${path}.${matchOn}`);
			}
			return this;
		}

		if (Array.isArray(path)) {
			path.forEach((entry) => this.prepend(entry));
			return this;
		}

		Object.entries(path).forEach(([key, value]) => {
			if (typeof value === "string") {
				this.prepend(key, value);
			} else {
				this.prepend(key);
			}
		});

		return this;
	}
}

export class AlwaysProp<TValue = unknown> extends BaseInertiaProp<TValue> {
	constructor(value: PropValue<TValue>) {
		super(toResolver(value));
	}
}

export class OptionalProp<TValue = unknown>
	extends BaseInertiaProp<TValue>
	implements IgnoreFirstLoad
{
	readonly ignoreFirstLoad = true as const;

	constructor(value: PropValue<TValue>) {
		super(toResolver(value));
	}
}

/**
 * @deprecated Use OptionalProp instead for clearer semantics.
 */
export class LazyProp<TValue = unknown> extends OptionalProp<TValue> {}

export class DeferProp<TValue = unknown>
	extends MergeableProp<TValue>
	implements IgnoreFirstLoad
{
	readonly ignoreFirstLoad = true as const;

	constructor(
		value: PropValue<TValue>,
		private readonly groupName: string | null = "default",
	) {
		super(toResolver(value));
		this.merge();
	}

	group(): string | null {
		return this.groupName;
	}
}

export class MergeProp<TValue = unknown> extends MergeableProp<TValue> {
	constructor(value: PropValue<TValue>) {
		super(toResolver(value));
		this.merge();
	}
}

export class ScrollMetadata implements ProvidesScrollMetadata {
	constructor(
		private readonly pageName: string,
		private readonly previous: number | string | null,
		private readonly next: number | string | null,
		private readonly current: number | string | null,
	) {}

	static manual(payload: {
		pageName?: string;
		previousPage?: number | string | null;
		nextPage?: number | string | null;
		currentPage?: number | string | null;
	}): ScrollMetadata {
		return new ScrollMetadata(
			payload.pageName ?? "page",
			payload.previousPage ?? null,
			payload.nextPage ?? null,
			payload.currentPage ?? null,
		);
	}

	static fromValue(value: unknown, wrapper: string): ScrollMetadata {
		const record =
			value && typeof value === "object" ? (value as Record<string, unknown>) : {};
		const data =
			record[wrapper] && typeof record[wrapper] === "object"
				? (record[wrapper] as Record<string, unknown>)
				: record;

		const meta =
			data.meta && typeof data.meta === "object"
				? (data.meta as Record<string, unknown>)
				: record.meta && typeof record.meta === "object"
					? (record.meta as Record<string, unknown>)
					: {};

		const links =
			data.links && typeof data.links === "object"
				? (data.links as Record<string, unknown>)
				: record.links && typeof record.links === "object"
					? (record.links as Record<string, unknown>)
					: {};

		const pageName =
			(typeof meta.path === "string" && new URL(meta.path, "https://lantern.app").searchParams.keys().next().value) ||
			"page";

		const nextPage =
			meta.next_page ??
			meta.nextPage ??
			extractPageNumber(toStringOrNull(links.next) ?? toStringOrNull(record.next_page_url));
		const previousPage =
			meta.prev_page ??
			meta.prevPage ??
			extractPageNumber(
				toStringOrNull(links.prev) ?? toStringOrNull(record.prev_page_url),
			);

		const currentPage =
			meta.current_page ??
			meta.currentPage ??
			record.current_page ??
			record.currentPage ??
			null;

		return new ScrollMetadata(
			pageName ?? "page",
			normalizePageValue(previousPage),
			normalizePageValue(nextPage),
			normalizePageValue(currentPage),
		);
	}

	getPageName(): string {
		return this.pageName;
	}

	getPreviousPage(): number | string | null {
		return this.previous;
	}

	getNextPage(): number | string | null {
		return this.next;
	}

	getCurrentPage(): number | string | null {
		return this.current;
	}
}

const extractPageNumber = (url: string | null): string | null => {
	if (!url) return null;

	try {
		return new URL(url, "https://lantern.app").searchParams.get("page");
	} catch {
		return null;
	}
};

const normalizePageValue = (
	value: unknown,
): number | string | null => {
	if (typeof value === "number" && !Number.isNaN(value)) {
		return value;
	}

	if (typeof value === "string") {
		return value;
	}

	return null;
};

const toStringOrNull = (value: unknown): string | null => {
	return typeof value === "string" ? value : null;
};

export class ScrollProp<TValue = unknown>
	extends MergeableProp<TValue>
	implements ProvidesScrollMetadata
{
	private resolvedValue: TValue | undefined;

	constructor(
		value: PropValue<TValue>,
		private readonly wrapper: string = "data",
		private readonly metadataProvider?:
			| ProvidesScrollMetadata
			| ((value: TValue) => ProvidesScrollMetadata),
	) {
		super(toResolver(value));
		this.merge();
	}

	async resolve(request: HttpRequest): Promise<TValue> {
		if (typeof this.resolvedValue !== "undefined") {
			return this.resolvedValue;
		}

		this.resolvedValue = await super.resolve(request);
		return this.resolvedValue;
	}

	configureMergeIntent(request: HttpRequest): this {
		const intent =
			request.header("X-Inertia-Infinite-Scroll-Merge-Intent") ?? "append";

		if (intent === "prepend") {
			this.prepend(this.wrapper);
		} else {
			this.append(this.wrapper);
		}

		return this;
	}

	getPageName(): string {
		return this.resolveMetadataProvider().getPageName();
	}

	getPreviousPage(): number | string | null {
		return this.resolveMetadataProvider().getPreviousPage();
	}

	getNextPage(): number | string | null {
		return this.resolveMetadataProvider().getNextPage();
	}

	getCurrentPage(): number | string | null {
		return this.resolveMetadataProvider().getCurrentPage();
	}

	metadata(): ScrollMetadataPayload {
		const metadata = this.resolveMetadataProvider();
		return {
			pageName: metadata.getPageName(),
			previousPage: metadata.getPreviousPage(),
			nextPage: metadata.getNextPage(),
			currentPage: metadata.getCurrentPage(),
		};
	}

	private resolveMetadataProvider(): ProvidesScrollMetadata {
		if (this.metadataProvider instanceof ScrollMetadata) {
			return this.metadataProvider;
		}

		if (typeof this.metadataProvider === "function") {
			return this.metadataProvider(this.resolvedValue as TValue);
		}

		return ScrollMetadata.fromValue(this.resolvedValue, this.wrapper);
	}
}

export const isArrayable = <TValue>(
	value: unknown,
): value is Arrayable<TValue> => {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof (value as Arrayable<TValue>).toArray === "function",
	);
};

export const isProvidesInertiaProperties = (
	value: unknown,
): value is ProvidesInertiaProperties => {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof (value as ProvidesInertiaProperties).toInertiaProperties ===
				"function",
	);
};

export const isProvidesInertiaProperty = (
	value: unknown,
): value is ProvidesInertiaProperty => {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof (value as ProvidesInertiaProperty).toInertiaProperty ===
				"function",
	);
};

export const isInertiaProp = (value: unknown): value is BaseInertiaProp => {
	return value instanceof BaseInertiaProp;
};

export const isMergeableProp = (value: unknown): value is Mergeable => {
	return Boolean(
		value &&
			typeof value === "object" &&
			"shouldMerge" in value &&
			typeof (value as Mergeable).shouldMerge === "function",
	);
};
