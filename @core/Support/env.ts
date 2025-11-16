const readEnv = (key: string): string | undefined => {
	if (typeof Bun !== "undefined" && Bun.env?.[key] !== undefined) {
		return Bun.env[key]!;
	}

	return process.env[key];
};

export const env = (key: string, defaultValue?: string): string => {
	const value = readEnv(key);

	if (value === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Environment variable ${key} is not defined`);
		}

		return defaultValue;
	}

	return value;
};

export const envBoolean = (key: string, defaultValue = false): boolean => {
	const value = readEnv(key);

	if (value === undefined) {
		return defaultValue;
	}

	return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

export const envNumber = (key: string, defaultValue?: number): number => {
	const value = readEnv(key);

	if (value === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Environment variable ${key} is not defined`);
		}

		return defaultValue;
	}

	const parsed = Number(value);

	if (Number.isNaN(parsed)) {
		throw new Error(`Environment variable ${key} is not a number`);
	}

	return parsed;
};

if (typeof globalThis.env !== "function") {
	globalThis.env = env;
}
