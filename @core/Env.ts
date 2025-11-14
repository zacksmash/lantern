export class Env {
	get(key: string, fallback?: string): string {
		const value = process.env[key];

		if (value !== undefined) {
			return value;
		}

		if (fallback !== undefined) {
			return fallback;
		}

		throw new Error(`Env key '${key}' missing and no fallback provided.`);
	}
}
