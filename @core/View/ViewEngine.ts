import { join } from "node:path";
import { TemplateLoader } from "@core/View/TemplateLoader";
import { ViteAssetTagGenerator } from "@core/Vite/AssetTagGenerator";

type ViewData = Record<string, unknown>;

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");

export interface ViewOptions {
	status?: number;
	headers?: Record<string, string>;
}

export class ViewEngine {
	constructor(
		private basePath: string = join(process.cwd(), "resources/views"),
		private loader: TemplateLoader = new TemplateLoader(),
		private assets: ViteAssetTagGenerator = new ViteAssetTagGenerator(),
	) {}

	async render(view: string, data: ViewData = {}): Promise<string> {
		const filePath = this.resolveViewPath(view);
		const template = await this.loader.load(filePath);
		const withVite = await this.injectVite(template);
		return this.injectVariables(withVite, data);
	}

	private resolveViewPath(view: string): string {
		const normalized = view.endsWith(".html") ? view : `${view}.html`;
		return join(this.basePath, normalized);
	}

	private async injectVite(template: string): Promise<string> {
		const tags = await this.assets.generateTags();
		return template.replace(/@vite/g, tags);
	}

	private injectVariables(template: string, data: ViewData): string {
		return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, key: string) => {
			if (Object.hasOwn(data, key)) {
				return escapeHtml(data[key]);
			}

			return "";
		});
	}
}
