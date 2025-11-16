import type { env as envHelper } from "@core/Support/env";

declare global {
	// eslint-disable-next-line no-var
	var env: typeof envHelper;
}
