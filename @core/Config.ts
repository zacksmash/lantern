import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type ConfigStore = Record<string, unknown>;
type ConfigValue = unknown;

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

export class Config {
	private static store: ConfigStore = {};
	private static frozen = false;

	/** Load all config files with environment overrides */
	load(root: string = process.cwd()) {
		if (Config.frozen) return Config.store;

		const configDir = join(root, "config");
		const files = readdirSync(configDir).filter((f) => f.endsWith(".ts"));

		// 1. Load base configs
		for (const file of files) {
			const name = file.replace(".ts", "");
			const mod = require(join(configDir, file));
			Config.store[name] = mod.default ?? mod;
		}

		// 2. Load environment‑specific overrides, if present
		const env = process.env.NODE_ENV?.trim();
		if (env) {
			for (const file of files) {
				const name = file.replace(".ts", "");
				const envFile = join(configDir, `${name}.${env}.ts`);
				if (existsSync(envFile)) {
					const mod = require(envFile);
					Config.store[name] = this.deepMerge(
						Config.store[name],
						mod.default ?? mod,
					);
				}
			}
		}

		Config.frozen = true;
		return Config.store;
	}

	/** Deep merge two config objects */
	private deepMerge(base: ConfigValue, override: ConfigValue): ConfigValue {
		if (!isRecord(base) || !isRecord(override)) {
			return override;
		}
		const out: Record<string, unknown> = { ...base };
		for (const key of Object.keys(override)) {
			out[key] = this.deepMerge(base[key], override[key]);
		}
		return out;
	}

	/** Get value using dot notation */
	get<T = unknown>(key: string, fallback?: T): T | undefined {
		const [file, ...rest] = key.split(".");
		if (!file) return fallback;
		let value: unknown = Config.store[file];
		if (typeof value === "undefined") return fallback;

		for (const part of rest) {
			if (!isRecord(value)) {
				return fallback;
			}
			value = value[part];
			if (typeof value === "undefined") {
				return fallback;
			}
		}
		return (value as T) ?? fallback;
	}

	/** Create a cached, production‑ready JSON file */
	cacheToFile(path: string = join(process.cwd(), "storage/config.cache.json")) {
		writeFileSync(path, JSON.stringify(Config.store, null, 2));
	}

	/** Load cached config JSON (no require calls) */
	loadFromCache(
		path: string = join(process.cwd(), "storage/config.cache.json"),
	) {
		if (!existsSync(path)) throw new Error("Config cache file missing.");
		const raw = readFileSync(path, "utf8");
		Config.store = JSON.parse(raw) as ConfigStore;
		Config.frozen = true;
		return Config.store;
	}
}
