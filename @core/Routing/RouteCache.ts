import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Route } from "./Route";

export interface SerializedRoute {
	methods: string[];
	uri: string;
	name?: string;
	middleware: string[];
	fallback?: boolean;
}

export interface RouteCachePayload {
	generatedAt: string;
	routes: SerializedRoute[];
}

export class RouteCache {
	constructor(private readonly cachePath: string) {}

	write(routes: Route[]): void {
		const payload: RouteCachePayload = {
			generatedAt: new Date().toISOString(),
			routes: routes.map((route) => ({
				methods: route.getMethods(),
				uri: route.getUriTemplate(),
				name: route.getName(),
				middleware: route.getMiddleware().map(String),
				fallback: route.isFallback(),
			})),
		};

		mkdirSync(path.dirname(this.cachePath), { recursive: true });
		writeFileSync(this.cachePath, JSON.stringify(payload, null, 2), "utf-8");
	}

	read(): RouteCachePayload | null {
		if (!existsSync(this.cachePath)) {
			return null;
		}

		const raw = readFileSync(this.cachePath, "utf-8");
		return JSON.parse(raw) as RouteCachePayload;
	}
}
