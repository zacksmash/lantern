import type { Plugin } from "vite";

export interface LanternPluginOptions {
	input?: string | string[];
}

export const lanternVitePlugin = (
	options: LanternPluginOptions = {},
): Plugin => {
	return {
		name: "lantern:placeholder",
		configureServer(server) {
			server.ws.send({
				type: "custom",
				event: "lantern:ready",
				data: {
					input: options.input ?? null,
				},
			});
		},
	};
};

export default lanternVitePlugin;
