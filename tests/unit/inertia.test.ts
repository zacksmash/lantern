import { beforeAll, describe, expect, test } from "bun:test";
import { HttpRequest } from "@core/Http/Request";
import {
	always,
	defer as deferProp,
	merge as mergeProp,
	optional,
	scroll as scrollProp,
} from "@core/Inertia/Inertia";
import { InertiaResponseFactory } from "@core/Inertia/InertiaResponseFactory";
import type { InertiaProps } from "@core/Inertia/InertiaTypes";
import { ViteAssetTagGenerator } from "@core/Vite/AssetTagGenerator";

const factory = new InertiaResponseFactory();
const MERGE_INTENT_HEADER = "X-Inertia-Infinite-Scroll-Merge-Intent";
let inertiaVersion: string;

type HeaderMap = Record<string, string>;

const makeRequest = (url: string, headers?: HeaderMap) =>
	new HttpRequest(new Request(url, { headers }));

const inertiaHeaders = (headers: HeaderMap = {}) => ({
	"X-Inertia": "true",
	"X-Inertia-Version": inertiaVersion,
	...headers,
});

const inertiaRequest = (headers?: HeaderMap) =>
	makeRequest("http://localhost/", inertiaHeaders(headers));

const partialRequest = (
	component: string,
	keys: string[],
	headers?: HeaderMap,
) =>
	makeRequest("http://localhost/", {
		...inertiaHeaders({
			"X-Inertia-Partial-Component": component,
			"X-Inertia-Partial-Data": keys.join(","),
		}),
		...(headers ?? {}),
	});

beforeAll(async () => {
	inertiaVersion = await new ViteAssetTagGenerator().getVersion();
});

describe("InertiaResponseFactory", () => {
	test("returns HTML shell for standard requests", async () => {
		const request = makeRequest("http://localhost/");
		const response = await factory.render(
			request,
			"Home",
			{ greeting: "Hello" },
			{ version: "test" },
		);

		expect(response.headers.get("Content-Type")).toContain("text/html");
		const body = await response.text();
		expect(body).toContain('data-page="');
		expect(body).toContain("Home");
	});

	test("returns JSON payload for X-Inertia requests", async () => {
		const request = inertiaRequest();
		const response = await factory.render(
			request,
			"Dashboard",
			{ users: 5 },
			{ version: inertiaVersion },
		);

		expect(response.headers.get("X-Inertia")).toBe("true");
		const json = (await response.json()) as any;
		expect(json.component).toBe("Dashboard");
		expect(json.props.users).toBe(5);
	});

	test("evaluates only requested partial props", async () => {
		const request = partialRequest("Reports", ["one"]);

		let twoEvaluated = false;

		const props: InertiaProps = {
			one: () => "first",
			two: () => {
				twoEvaluated = true;
				return "second";
			},
		};

		const response = await factory.render(request, "Reports", props, {
			version: inertiaVersion,
		});
		const json = (await response.json()) as any;
		expect(json.props.one).toBe("first");
		expect(json.props.two).toBeUndefined();
		expect(twoEvaluated).toBe(false);
	});

	test("responds with 409 when versions mismatch", async () => {
		const request = makeRequest("http://localhost/", {
			"X-Inertia": "true",
			"X-Inertia-Version": "outdated",
		});

		const response = await factory.render(
			request,
			"Home",
			{},
			{ version: "current" },
		);

		expect(response.status).toBe(409);
		expect(response.headers.get("X-Inertia-Location")).toBe("/");
	});

	test("optional props are omitted until requested", async () => {
		const initial = await factory.render(
			inertiaRequest(),
			"Reports",
			{
				stats: optional(() => "value"),
			},
			{ version: inertiaVersion },
		);
		const initialJson = (await initial.json()) as any;
		expect(initialJson.props.stats).toBeUndefined();

		const partial = await factory.render(
			partialRequest("Reports", ["stats"]),
			"Reports",
			{
				stats: optional(() => "value"),
			},
			{ version: inertiaVersion },
		);
		const partialJson = (await partial.json()) as any;
		expect(partialJson.props.stats).toBe("value");
	});

	test("deferred props register metadata and load when requested", async () => {
		const initial = await factory.render(
			inertiaRequest(),
			"Permissions",
			{
				perms: deferProp(() => ["create", "edit"]),
			},
			{ version: inertiaVersion },
		);
		const initialJson = (await initial.json()) as any;
		expect(initialJson.props.perms).toBeUndefined();
		expect(initialJson.deferredProps).toMatchObject({ perms: ["perms"] });

		const partial = await factory.render(
			partialRequest("Permissions", ["perms"]),
			"Permissions",
			{
				perms: deferProp(() => ["create", "edit"]),
			},
			{ version: inertiaVersion },
		);
		const partialJson = (await partial.json()) as any;
		expect(partialJson.props.perms).toEqual(["create", "edit"]);
		expect(partialJson.deferredProps).toBeUndefined();
	});

	test("always props remain included on partial reloads", async () => {
		const partial = await factory.render(
			partialRequest("Stats", ["secondary"]),
			"Stats",
			{
				primary: always("always"),
				secondary: () => "other",
			},
			{ version: inertiaVersion },
		);
		const json = (await partial.json()) as any;
		expect(json.props.primary).toBe("always");
		expect(json.props.secondary).toBe("other");
	});

	test("merge props include metadata for partial requests", async () => {
		const response = await factory.render(
			partialRequest("Tags", ["tags"]),
			"Tags",
			{
				tags: mergeProp(() => [{ id: 1 }], {
					match: "tags.id",
				}),
			},
			{ version: inertiaVersion },
		);

		const json = (await response.json()) as any;
		expect(json.mergeProps).toContain("tags");
		expect(json.matchPropsOn).toContain("tags.id");
	});

	test("scroll props emit metadata and respect merge intent", async () => {
		const paginator = {
			data: [{ id: 1 }],
			meta: {
				current_page: 2,
			},
			next_page_url: "http://localhost/tags?page=3",
			prev_page_url: "http://localhost/tags?page=1",
		};

		const response = await factory.render(
			partialRequest("Tags", ["tags"], {
				[MERGE_INTENT_HEADER]: "append",
			}),
			"Tags",
			{
				tags: scrollProp(() => paginator, {
					match: "tags.data.id",
				}),
			},
			{ version: inertiaVersion },
		);

		const json = (await response.json()) as any;
		expect(json.mergeProps).toContain("tags");
		expect(json.matchPropsOn).toContain("tags.data.id");
		expect(json.scrollProps.tags).toMatchObject({
			pageName: "page",
			currentPage: 2,
			nextPage: "3",
			previousPage: "1",
			reset: false,
		});

		const prepend = await factory.render(
			partialRequest("Tags", ["tags"], {
				[MERGE_INTENT_HEADER]: "prepend",
			}),
			"Tags",
			{
				tags: scrollProp(() => paginator),
			},
			{ version: inertiaVersion },
		);

		const prependJson = (await prepend.json()) as any;
		expect(prependJson.prependProps).toContain("tags");
	});
});
