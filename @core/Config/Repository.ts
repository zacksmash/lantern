import app from "@root/config/app";
import auth from "@root/config/auth";
import cache from "@root/config/cache";
import database from "@root/config/database";
import session from "@root/config/session";

type ConfigValues = Record<string, unknown>;

const CONFIG_MAP: Record<string, ConfigValues> = {
	app,
	auth,
	cache,
	database,
	session,
};

export class ConfigRepository {
	private readonly values = new Map<string, ConfigValues>(
		Object.entries(CONFIG_MAP),
	);

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
}
