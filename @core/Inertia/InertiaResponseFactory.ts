import type { HttpRequest } from "@core/Http/Request";
import type {
	InertiaPage,
	InertiaProps,
	InertiaRenderOptions,
	PropDescriptor,
	ScrollOptions,
	ScrollProp,
} from "@core/Inertia/InertiaTypes";
import { INERTIA_PROP_SYMBOL, isWrappedProp } from "@core/Inertia/InertiaTypes";
import { AppShellRenderer } from "@core/View/AppShellRenderer";
import { ViteAssetTagGenerator } from "@core/Vite/AssetTagGenerator";

type PartialKeys = Set<string> | null;

const MERGE_INTENT_HEADER = "X-Inertia-Infinite-Scroll-Merge-Intent";

interface RenderMetadata {
	deferred: Map<string, string[]>;
	merge: Set<string>;
	prepend: Set<string>;
	deepMerge: Set<string>;
	match: Set<string>;
	scroll: Record<string, ScrollProp>;
}

export class InertiaResponseFactory {
	constructor(
		private readonly assets = new ViteAssetTagGenerator(),
		private readonly template = new AppShellRenderer(),
	) {}

	async render(
		request: HttpRequest,
		component: string,
		props: InertiaProps = {},
		options: InertiaRenderOptions = {},
	): Promise<Response> {
		const version = options.version ?? (await this.assets.getVersion());
		const clientVersion = request.header("X-Inertia-Version");
		const url = this.url(request);

		if (clientVersion && clientVersion !== version) {
			return new Response(null, {
				status: 409,
				headers: { "X-Inertia-Location": url },
			});
		}

		const resolution = await this.resolveProps(request, component, props);

		const page: InertiaPage = {
			component,
			props: resolution.props,
			url,
			version,
		};

		this.applyMetadata(page, resolution.metadata);

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

	private async resolveProps(
		request: HttpRequest,
		component: string,
		props: InertiaProps,
	) {
		const only = this.partialDataKeys(request, component);
		const mergeIntent = this.mergeIntent(request);

		const metadata: RenderMetadata = {
			deferred: new Map(),
			merge: new Set(),
			prepend: new Set(),
			deepMerge: new Set(),
			match: new Set(),
			scroll: {},
		};
		const resolved: Record<string, any> = {};

		for (const [key, rawValue] of Object.entries(props)) {
			const descriptor = this.normalizeDescriptor(rawValue);
			const shouldInclude = this.shouldIncludeProp(key, descriptor, only);

			if (!shouldInclude) {
				this.registerSkippedProp(key, descriptor, metadata);
				continue;
			}

			const value = await descriptor.resolver(request);
			resolved[key] = value;
			this.applyPropMetadata(
				key,
				descriptor,
				value,
				metadata,
				mergeIntent,
				request,
			);
		}

		return { props: resolved, metadata };
	}

	private partialDataKeys(request: HttpRequest, component: string) {
		const partialComponent = request.header("X-Inertia-Partial-Component");
		if (partialComponent !== component) return null;

		const raw = request.header("X-Inertia-Partial-Data");
		if (!raw) return null;

		const keys = raw
			.split(",")
			.map((key) => key.trim())
			.filter(Boolean);

		return new Set(keys);
	}

	private makeJsonResponse(
		page: InertiaPage,
		options: InertiaRenderOptions,
	): Response {
		return new Response(JSON.stringify(page), {
			status: options.status ?? 200,
			headers: {
				"Content-Type": "application/json",
				"X-Inertia": "true",
				Vary: "Accept",
				...(options.headers ?? {}),
			},
		});
	}

	private isInertiaRequest(request: HttpRequest): boolean {
		return request.header("X-Inertia") === "true";
	}

	private url(request: HttpRequest): string {
		const url = request.urlInstance;
		return `${url.pathname}${url.search}`;
	}

	private mergeIntent(request: HttpRequest) {
		const intent = request.header(MERGE_INTENT_HEADER);
		if (!intent) return null;
		if (intent === "append" || intent === "prepend") {
			return intent;
		}
		return null;
	}

	private normalizeDescriptor(
		value: InertiaProps[keyof InertiaProps],
	): PropDescriptor {
		if (isWrappedProp(value)) {
			return value[INERTIA_PROP_SYMBOL];
		}

		if (typeof value === "function") {
			return {
				kind: "value",
				resolver: value as (request: HttpRequest) => any,
			};
		}

		return {
			kind: "value",
			resolver: () => value,
		};
	}

	private shouldIncludeProp(
		key: string,
		descriptor: PropDescriptor,
		partial: PartialKeys,
	): boolean {
		if (!partial) {
			return descriptor.kind !== "optional" && descriptor.kind !== "deferred";
		}

		if (descriptor.kind === "always") {
			return true;
		}

		if (partial.has(key)) {
			return true;
		}

		return false;
	}

	private registerSkippedProp(
		key: string,
		descriptor: PropDescriptor,
		metadata: RenderMetadata,
	) {
		if (descriptor.kind === "deferred") {
			const group = descriptor.group ?? key;
			const only = descriptor.only ?? [key];
			metadata.deferred.set(group, only);
		}
	}

	private applyPropMetadata(
		key: string,
		descriptor: PropDescriptor,
		value: any,
		metadata: RenderMetadata,
		mergeIntent: "append" | "prepend" | null,
		request: HttpRequest,
	) {
		if (descriptor.kind === "merge") {
			const match = descriptor.match ?? [];
			this.applyMergeMetadata(
				descriptor.path ?? key,
				descriptor.strategy,
				match,
				metadata,
				mergeIntent,
			);
			return;
		}

		if (descriptor.kind === "scroll") {
			const scrollMeta = this.buildScrollMetadata(
				key,
				value,
				descriptor.options ?? {},
				request,
				mergeIntent,
			);

			if (scrollMeta) {
				metadata.scroll[key] = scrollMeta;
			}

			const match = descriptor.match ?? [];
			this.applyMergeMetadata(key, "append", match, metadata, mergeIntent);
			return;
		}
	}

	private applyMergeMetadata(
		path: string,
		strategy: "append" | "prepend" | "deep",
		match: string[],
		metadata: RenderMetadata,
		mergeIntent: "append" | "prepend" | null,
	) {
		const finalStrategy = mergeIntent ?? strategy;

		if (finalStrategy === "append") {
			metadata.merge.add(path);
		} else if (finalStrategy === "prepend") {
			metadata.prepend.add(path);
		} else {
			metadata.deepMerge.add(path);
		}

		match.forEach((item) => {
			metadata.match.add(item);
		});
	}

	private buildScrollMetadata(
		_key: string,
		value: any,
		options: ScrollOptions,
		request: HttpRequest,
		mergeIntent: "append" | "prepend" | null,
	): ScrollProp | null {
		const pageName = options.pageName ?? this.defaultPageName(request);
		const info = this.extractPaginationInfo(value, pageName);
		const currentPage =
			options.currentPage ??
			info.currentPage ??
			this.currentPageFromRequest(request, pageName);
		const nextPage = options.nextPage ?? info.nextPage;
		const previousPage = options.previousPage ?? info.previousPage;
		const reset = options.reset ?? !mergeIntent;

		if (
			currentPage === undefined &&
			nextPage === undefined &&
			previousPage === undefined
		) {
			return null;
		}

		return {
			pageName,
			currentPage: currentPage ?? null,
			nextPage: nextPage ?? null,
			previousPage: previousPage ?? null,
			reset,
		};
	}

	private extractPaginationInfo(value: any, pageName: string) {
		const meta = value?.meta ?? {};
		const links = value?.links ?? {};
		const currentPage =
			meta.current_page ??
			meta.currentPage ??
			value?.current_page ??
			value?.currentPage ??
			null;
		const nextPage =
			meta.next_page ??
			meta.nextPage ??
			this.extractPageNumber(links.next ?? value?.next_page_url, pageName);
		const previousPage =
			meta.prev_page ??
			meta.prevPage ??
			this.extractPageNumber(links.prev ?? value?.prev_page_url, pageName);

		return { currentPage, nextPage, previousPage };
	}

	private extractPageNumber(url: string | null | undefined, pageName: string) {
		if (!url) return null;

		try {
			const parsed = new URL(url);
			const param = parsed.searchParams.get(pageName);
			return param ?? null;
		} catch {
			return null;
		}
	}

	private currentPageFromRequest(request: HttpRequest, pageName: string) {
		const value = request.query(pageName);
		if (!value) return 1;

		if (Array.isArray(value)) {
			return value[0] ?? 1;
		}

		const parsed = Number(value);
		return Number.isNaN(parsed) ? value : parsed;
	}

	private defaultPageName(request: HttpRequest) {
		const params = request.urlInstance.searchParams;
		if (params.has("page")) return "page";
		const first = params.keys().next();
		return first.done ? "page" : first.value;
	}

	private applyMetadata(page: InertiaPage, metadata: RenderMetadata) {
		if (metadata.deferred.size) {
			const deferred = Object.fromEntries(metadata.deferred);
			page.deferredProps = deferred;
			page.props.deferred = deferred;
		}

		if (metadata.merge.size) {
			page.mergeProps = Array.from(metadata.merge);
		}

		if (metadata.prepend.size) {
			page.prependProps = Array.from(metadata.prepend);
		}

		if (metadata.deepMerge.size) {
			page.deepMergeProps = Array.from(metadata.deepMerge);
		}

		if (metadata.match.size) {
			page.matchPropsOn = Array.from(metadata.match);
		}

		if (Object.keys(metadata.scroll).length) {
			page.scrollProps = metadata.scroll;
		}
	}
}

export const inertiaResponseFactory = new InertiaResponseFactory();
