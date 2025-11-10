import { cache as helper_cache } from '@core/Cache';
import { config as helper_config } from '@core/Config';
import { env as helper_env } from '@core/Env';

declare global {
	var dd: (value: any) => never;
	var env: (key: string, fallback?: string) => string | undefined;
	var config: (key: string, fallback?: any) => any;
	var cache: () => import('@core/Cache').Cache;
}

globalThis.dd = (value: any): never => {
	throw new Error(JSON.stringify(value, null, 2));
};

globalThis.env = (key: string, fallback?: string): string | undefined => {
	return helper_env(key, fallback);
};

globalThis.config = (key: string, fallback?: any): any => {
	return helper_config(key, fallback);
};

globalThis.cache = (): import('@core/Cache').Cache => {
	return helper_cache();
};
