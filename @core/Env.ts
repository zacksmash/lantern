import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string>();

export function loadEnv(root: string = process.cwd()) {
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
			cache.set(key, value);
		}
	} catch {
		// silently ignore missing .env
	}
}

export function env(key: string, fallback?: string): string {
	if (cache.has(key)) return cache.get(key)!;

	const value = process.env[key];
	if (value !== undefined) return value;

	if (fallback !== undefined) return fallback;

	throw new Error(`Env key '${key}' missing and no fallback provided.`);
}
