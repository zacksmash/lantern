import fs from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import colors from "picocolors";
import {
	type ConfigEnv,
	createLogger,
	loadEnv,
	type Plugin,
	type ResolvedConfig,
	type Rollup,
	type SSROptions,
	type UserConfig,
} from "vite";

interface PluginConfig {
	/**
	 * The path or paths of the entry points to compile.
	 */
	input: Rollup.InputOption;

	/**
	 * Laravel's public directory.
	 *
	 * @default 'public'
	 */
	publicDirectory?: string;

	/**
	 * The public subdirectory where compiled assets should be written.
	 *
	 * @default 'build'
	 */
	buildDirectory?: string;

	/**
	 * The path to the "hot" file.
	 *
	 * @default `${publicDirectory}/hot`
	 */
	hotFile?: string;

	/**
	 * Transform the code while serving.
	 */
	transformOnServe?: (code: string, url: DevServerUrl) => string;
}

interface LanternPlugin extends Plugin {
	config: (config: UserConfig, env: ConfigEnv) => UserConfig;
}

type DevServerUrl = `${"http" | "https"}://${string}:${number}`;

let exitHandlersBound = false;

const logger = createLogger("info", {
	prefix: "[lantern-vite-plugin]",
});

/**
 * Lantern plugin for Vite.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export default function lantern(
	config: string | string[] | PluginConfig,
): [LanternPlugin, ...Plugin[]] {
	const pluginConfig = resolvePluginConfig(config);

	return [resolveLanternPlugin(pluginConfig)];
}

/**
 * Resolve the Lantern Plugin configuration.
 */
function resolveLanternPlugin(
	pluginConfig: Required<PluginConfig>,
): LanternPlugin {
	let viteDevServerUrl: DevServerUrl;
	let resolvedConfig: ResolvedConfig;
	let userConfig: UserConfig;

	const defaultAliases: Record<string, string> = {
		"@": "/assets/js",
	};

	return {
		name: "lantern",
		enforce: "post",
		config: (config, { command, mode }) => {
			userConfig = config;
			const ssr = !!userConfig.build?.ssr;
			const env = loadEnv(mode, userConfig.envDir || process.cwd(), "");
			const assetUrl = env.ASSET_URL ?? "";

			ensureCommandShouldRunInEnvironment(command, env);

			return {
				base:
					userConfig.base ??
					(command === "build" ? resolveBase(pluginConfig, assetUrl) : ""),
				publicDir: userConfig.publicDir ?? false,
				build: {
					manifest:
						userConfig.build?.manifest ?? (ssr ? false : "manifest.json"),
					outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig),
					rollupOptions: {
						input:
							userConfig.build?.rollupOptions?.input ??
							resolveInput(pluginConfig),
					},
					assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0,
				},
				server: {
					origin:
						userConfig.server?.origin ??
						"http://__laravel_vite_placeholder__.test",
					cors: userConfig.server?.cors ?? {
						origin: userConfig.server?.origin ?? [
							/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, // Copied from Vite itself. We can import this once we drop 5.0 support and require Vite 6.1+. Source: https://github.com/vitejs/vite/blob/0c854645bd17960abbe8f01b602d1a1da1a2b9fd/packages/vite/src/node/constants.ts#L200-L201
							...(env.APP_URL ? [env.APP_URL] : []), // *               (APP_URL="http://my-app.tld")
							/^https?:\/\/.*\.test(:\d+)?$/, // Valet / Herd    (SCHEME://*.test:PORT)
						],
					},
				},
				resolve: {
					alias: Array.isArray(userConfig.resolve?.alias)
						? [
								...(userConfig.resolve?.alias ?? []),
								...Object.keys(defaultAliases).map((alias) => ({
									find: alias,
									replacement: defaultAliases[alias],
								})),
							]
						: {
								...defaultAliases,
								...userConfig.resolve?.alias,
							},
				},
				ssr: {
					noExternal: noExternalInertiaHelpers(userConfig),
				},
			};
		},
		configResolved(config) {
			resolvedConfig = config;
		},
		transform(code) {
			if (resolvedConfig.command === "serve") {
				code = code.replace(
					/http:\/\/__laravel_vite_placeholder__\.test/g,
					viteDevServerUrl,
				);

				return pluginConfig.transformOnServe(code, viteDevServerUrl);
			}
		},
		configureServer(server) {
			const envDir = resolvedConfig.envDir || process.cwd();
			const appUrl =
				loadEnv(resolvedConfig.mode, envDir, "APP_URL").APP_URL ?? "undefined";

			server.httpServer?.once("listening", () => {
				const address = server.httpServer?.address();

				const isAddressInfo = (
					x: string | AddressInfo | null | undefined,
				): x is AddressInfo => typeof x === "object";
				if (isAddressInfo(address)) {
					viteDevServerUrl = userConfig.server?.origin
						? (userConfig.server.origin as DevServerUrl)
						: resolveDevServerUrl(address, server.config);

					const hotFileParentDirectory = path.dirname(pluginConfig.hotFile);

					if (!fs.existsSync(hotFileParentDirectory)) {
						fs.mkdirSync(hotFileParentDirectory, { recursive: true });

						setTimeout(() => {
							logger.info(
								`Hot file directory created ${colors.dim(fs.realpathSync(hotFileParentDirectory))}`,
								{ clear: true, timestamp: true },
							);
						}, 200);
					}

					fs.writeFileSync(
						pluginConfig.hotFile,
						`${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}`,
					);

					setTimeout(() => {
						server.config.logger.info(
							`\n  ${colors.red(`${colors.bold("LARAVEL")} ${laravelVersion()}`)}  ${colors.dim("plugin")} ${colors.bold(`v${pluginVersion()}`)}`,
						);
						server.config.logger.info("");
						server.config.logger.info(
							`  ${colors.green("➜")}  ${colors.bold("APP_URL")}: ${colors.cyan(appUrl.replace(/:(\d+)/, (_, port) => `:${colors.bold(port)}`))}`,
						);
					}, 100);
				}
			});

			if (!exitHandlersBound) {
				const clean = () => {
					if (fs.existsSync(pluginConfig.hotFile)) {
						fs.rmSync(pluginConfig.hotFile);
					}
				};

				process.on("exit", clean);
				process.on("SIGINT", () => process.exit());
				process.on("SIGTERM", () => process.exit());
				process.on("SIGHUP", () => process.exit());

				exitHandlersBound = true;
			}

			return () =>
				server.middlewares.use((req, res, next) => {
					if (req.url === "/index.html") {
						res.statusCode = 404;

						res.end(
							fs
								.readFileSync(path.join(dirname(), "dev-server-index.html"))
								.toString()
								.replace(/{{ APP_URL }}/g, appUrl),
						);
					}

					next();
				});
		},
	};
}

/**
 * Validate the command can run in the given environment.
 */
function ensureCommandShouldRunInEnvironment(
	command: "build" | "serve",
	env: Record<string, string>,
): void {
	if (command === "build" || env.LARAVEL_BYPASS_ENV_CHECK === "1") {
		return;
	}

	if (typeof env.LARAVEL_VAPOR !== "undefined") {
		throw Error(
			"You should not run the Vite HMR server on Vapor. You should build your assets for production instead. To disable this ENV check you may set LARAVEL_BYPASS_ENV_CHECK=1",
		);
	}

	if (typeof env.LARAVEL_FORGE !== "undefined") {
		throw Error(
			"You should not run the Vite HMR server in your Forge deployment script. You should build your assets for production instead. To disable this ENV check you may set LARAVEL_BYPASS_ENV_CHECK=1",
		);
	}

	if (typeof env.LARAVEL_ENVOYER !== "undefined") {
		throw Error(
			"You should not run the Vite HMR server in your Envoyer hook. You should build your assets for production instead. To disable this ENV check you may set LARAVEL_BYPASS_ENV_CHECK=1",
		);
	}

	if (typeof env.CI !== "undefined") {
		throw Error(
			"You should not run the Vite HMR server in CI environments. You should build your assets for production instead. To disable this ENV check you may set LARAVEL_BYPASS_ENV_CHECK=1",
		);
	}
}

/**
 * The version of Laravel being run.
 */
function laravelVersion(): string {
	try {
		const composer = JSON.parse(fs.readFileSync("composer.lock").toString());

		return (
			composer.packages?.find(
				(composerPackage: { name: string }) =>
					composerPackage.name === "laravel/framework",
			)?.version ?? ""
		);
	} catch {
		return "";
	}
}

/**
 * The version of the Laravel Vite plugin being run.
 */
function pluginVersion(): string {
	try {
		return JSON.parse(
			fs.readFileSync(path.join(dirname(), "../package.json")).toString(),
		)?.version;
	} catch {
		return "0.0.0";
	}
}

/**
 * Convert the users configuration into a standard structure with defaults.
 */
function resolvePluginConfig(
	config: string | string[] | PluginConfig,
): Required<PluginConfig> {
	if (typeof config === "undefined") {
		throw new Error("lantern-vite-plugin: missing configuration.");
	}

	if (typeof config === "string" || Array.isArray(config)) {
		config = { input: config };
	}

	if (typeof config.input === "undefined") {
		throw new Error('lantern-vite-plugin: missing configuration for "input".');
	}

	if (typeof config.publicDirectory === "string") {
		config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, "");

		if (config.publicDirectory === "") {
			throw new Error(
				"lantern-vite-plugin: publicDirectory must be a subdirectory. E.g. 'public'.",
			);
		}
	}

	if (typeof config.buildDirectory === "string") {
		config.buildDirectory = config.buildDirectory
			.trim()
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");

		if (config.buildDirectory === "") {
			throw new Error(
				"lantern-vite-plugin: buildDirectory must be a subdirectory. E.g. 'build'.",
			);
		}
	}

	return {
		input: config.input,
		publicDirectory: config.publicDirectory ?? "public",
		buildDirectory: config.buildDirectory ?? "build",
		hotFile:
			config.hotFile ?? path.join(config.publicDirectory ?? "public", "hot"),
		transformOnServe: config.transformOnServe ?? ((code) => code),
	};
}

/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config: Required<PluginConfig>, assetUrl: string): string {
	return (
		assetUrl +
		(!assetUrl.endsWith("/") ? "/" : "") +
		config.buildDirectory +
		"/"
	);
}

/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(
	config: Required<PluginConfig>,
): Rollup.InputOption | undefined {
	return config.input;
}

/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(config: Required<PluginConfig>): string | undefined {
	return path.join(config.publicDirectory, config.buildDirectory);
}

/**
 * Resolve the dev server URL from the server address and configuration.
 */
function resolveDevServerUrl(
	address: AddressInfo,
	config: ResolvedConfig,
): DevServerUrl {
	const configHmrProtocol =
		typeof config.server.hmr === "object" ? config.server.hmr.protocol : null;
	const clientProtocol = configHmrProtocol
		? configHmrProtocol === "wss"
			? "https"
			: "http"
		: null;
	const serverProtocol = config.server.https ? "https" : "http";
	const protocol = clientProtocol ?? serverProtocol;

	const configHmrHost =
		typeof config.server.hmr === "object" ? config.server.hmr.host : null;
	const configHost =
		typeof config.server.host === "string" ? config.server.host : null;
	const serverAddress = isIpv6(address)
		? `[${address.address}]`
		: address.address;
	const host = configHmrHost ?? configHost ?? serverAddress;

	const configHmrClientPort =
		typeof config.server.hmr === "object" ? config.server.hmr.clientPort : null;
	const port = configHmrClientPort ?? address.port;

	return `${protocol}://${host}:${port}`;
}

function isIpv6(address: AddressInfo): boolean {
	return (
		address.family === "IPv6" ||
		// In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
		// See: https://github.com/laravel/vite-plugin/issues/103
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error-next-line
		address.family === 6
	);
}

/**
 * Add the Inertia helpers to the list of SSR dependencies that aren't externalized.
 *
 * @see https://vitejs.dev/guide/ssr.html#ssr-externals
 */
function noExternalInertiaHelpers(
	config: UserConfig,
): true | Array<string | RegExp> {
	/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
	const userNoExternal = (config.ssr as SSROptions | undefined)?.noExternal;
	const pluginNoExternal = ["lantern-vite-plugin"];

	if (userNoExternal === true) {
		return true;
	}

	if (typeof userNoExternal === "undefined") {
		return pluginNoExternal;
	}

	return [
		...(Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal]),
		...pluginNoExternal,
	];
}

/**
 * The directory of the current file.
 */
function dirname(): string {
	return fileURLToPath(new URL(".", import.meta.url));
}
