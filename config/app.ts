import { env } from "@core/Support/env";

export default {
	name: "Lantern",
	env: env("APP_ENV", "production"),
	debug: env("APP_DEBUG", "false") === "true",
	key: env("APP_KEY", `base64:${Buffer.alloc(32).toString("base64")}`),
};
