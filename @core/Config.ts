import { readdirSync } from 'node:fs';
import { join } from 'node:path';

class ConfigStore {
	private config: Record<string, any> = {};

	load() {
		const configDir = join(process.cwd(), 'config');
		const files = readdirSync(configDir);

		for (const file of files) {
			if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

			const name = file.replace(/\.(ts|js)$/, '');
			const module = require(join(configDir, file));

			this.config[name] = module.default || module;
		}
	}

	get(path: string, fallback: any = null): any {
		const [file, ...keys] = path.split('.');

		if (!file) {
			return fallback;
		}

		if (!this.config[file]) {
			throw new Error(`Config file "${file}" not found`);
		}

		let value = this.config[file];

		for (const key of keys) {
			if (value && key in value) {
				value = value[key];
			} else {
				return fallback;
			}
		}

		return value;
	}
}

export const Config = new ConfigStore();

export function config(path: string, fallback?: any) {
	return Config.get(path, fallback);
}
