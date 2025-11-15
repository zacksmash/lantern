import { readFile } from "node:fs/promises";

export class TemplateLoader {
	private cache = new Map<string, string>();

	constructor(private readonly options: { cache?: boolean } = {}) {}

	async load(filePath: string): Promise<string> {
		if (this.options.cache !== false && this.cache.has(filePath)) {
			return this.cache.get(filePath)!;
		}

		const contents = await readFile(filePath, "utf8");

		if (this.options.cache !== false) {
			this.cache.set(filePath, contents);
		}

		return contents;
	}
}
