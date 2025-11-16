import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type ConfigValues = Record<string, unknown>;

const SUPPORTED_EXTENSIONS = new Set([".ts", ".js", ".mjs", ".cjs"]);
const requireModule = createRequire(import.meta.url);

export class ConfigRepository {
	private readonly values = new Map<string, ConfigValues>();

	constructor(private readonly basePath: string = process.cwd()) {
		this.loadConfigDirectory();
	}

	get<T = unknown>(key: string, defaultValue?: T): T {
		const [fileSegment, ...segments] = key.split(".");
		const file = fileSegment ?? "";

		if (file === "") {
			throw new Error("Configuration key cannot be empty.");
		}

		const config = this.values.get(file);

		if (!config) {
			if (defaultValue !== undefined) {
				return defaultValue;
			}

			throw new Error(`Configuration "${file}" not found.`);
		}

		if (segments.length === 0) {
			return config as T;
		}

		let current: any = config;
		for (const segment of segments) {
			if (current[segment] === undefined) {
				if (defaultValue !== undefined) {
					return defaultValue;
				}

				throw new Error(`Configuration value "${key}" not found.`);
			}

			current = current[segment];
		}

		return current as T;
	}

	set(key: string, value: unknown): void {
		const [fileSegment, ...segments] = key.split(".");
		const file = fileSegment ?? "";

		if (file === "") {
			throw new Error("Configuration key cannot be empty.");
		}
		const config = this.values.get(file) ?? {};

		if (segments.length === 0) {
			this.values.set(file, value as ConfigValues);
			return;
		}

		let current: any = config;
		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i]!;
			current[segment] = current[segment] ?? {};
			current = current[segment];
		}

		current[segments[segments.length - 1]!] = value;
		this.values.set(file, config);
	}

	private loadConfigDirectory(): void {
		const configDir = path.resolve(this.basePath, "config");
		const entries = readdirSync(configDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isFile()) {
				continue;
			}

			const ext = path.extname(entry.name);
			if (!SUPPORTED_EXTENSIONS.has(ext)) {
				continue;
			}

			const key = entry.name.slice(0, -ext.length);
			const filePath = path.join(configDir, entry.name);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const loaded = requireModule(filePath);
			const config =
				typeof loaded?.default === "object" && loaded.default !== null
					? loaded.default
					: loaded;

			this.values.set(key, config as ConfigValues);
		}
	}
}
