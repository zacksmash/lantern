import type { MasonManager } from "@core/Mason/MasonManager";

let resolver: (() => MasonManager) | null = null;

export const setMasonResolver = (factory: () => MasonManager) => {
	resolver = factory;
};

export const getMasonManager = (): MasonManager => {
	if (!resolver) {
		throw new Error(
			"Mason manager is not available. Ensure MasonServiceProvider is registered before using models.",
		);
	}

	return resolver();
};
