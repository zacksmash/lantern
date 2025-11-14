import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Stronger typing: config files contain objects
export class Config {
	private static store: Record<string, any> = {};
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
	private deepMerge(base: any, override: any): any {
		if (
			typeof base !== "object" ||
			typeof override !== "object" ||
			!base ||
			!override
		) {
			return override;
		}
		const out: any = { ...base };
		for (const key of Object.keys(override)) {
			out[key] = this.deepMerge(base[key], override[key]);
		}
		return out;
	}

	/** Get value using dot notation */
	get(key: string, fallback?: any): any {
		const [file, ...rest] = key.split(".");
		if (!file) return fallback;
		const target = Config.store[file];
		if (!target) return fallback;

		let value = target;
		for (const part of rest) {
			if (value == null || typeof value !== "object") return fallback;
			value = value[part];
		}
		return value ?? fallback;
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
		Config.store = JSON.parse(raw);
		Config.frozen = true;
		return Config.store;
	}
}
