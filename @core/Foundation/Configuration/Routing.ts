export type RouteManifestEntry = string | string[] | null | undefined;

export interface RoutingConfiguration {
	web?: RouteManifestEntry;
	api?: RouteManifestEntry;
	commands?: RouteManifestEntry;
	health?: string | null;
	channels?: RouteManifestEntry;
	pages?: RouteManifestEntry;
	apiPrefix?: string;
	then?: (() => void) | null;
}
