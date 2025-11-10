export function env(key: string, fallback?: any): string | undefined {
	return process.env[key] ?? fallback;
}
