export type RouteManifest = Record<
	string,
	{
		uri: string;
		methods: string[];
	}
>;
