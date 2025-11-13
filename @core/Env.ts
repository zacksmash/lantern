import { readFileSync } from "node:fs";
import { join } from "node:path";

export class Env {
	private cache = new Map<string, string>();

	load(root: string = process.cwd()) {
		const file = join(root, ".env");

		try {
			const content = readFileSync(file, "utf8");

			for (const line of content.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;

				const [key, ...rest] = trimmed.split("=");
				const value = rest.join("=").trim();

				if (!key) continue;

				process.env[key] ??= value;
				this.cache.set(key, value);
			}
		} catch {
			// silently ignore missing .env
		}
	}

	get(key: string, fallback?: string): string {
		if (this.cache.has(key)) return this.cache.get(key)!;

		const value = process.env[key];
		if (value !== undefined) return value;

		if (fallback !== undefined) return fallback;

		throw new Error(`Env key '${key}' missing and no fallback provided.`);
	}
}
