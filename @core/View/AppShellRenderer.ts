import { join } from "node:path";
import type { InertiaPage } from "@core/Inertia/InertiaTypes";
import { TemplateLoader } from "@core/View/TemplateLoader";

const escapeAttribute = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;")
		.replace(/</g, "&lt;");

const escapeJson = (value: string) => value.replace(/</g, "\\u003c");

export class AppShellRenderer {
	private loader: TemplateLoader;
	private templatePath: string;

	constructor(
		templatePath: string = join(process.cwd(), "assets/index.html"),
		loader: TemplateLoader = new TemplateLoader(),
	) {
		this.templatePath = templatePath;
		this.loader = loader;
	}

	async render(page: InertiaPage, assetTags: string): Promise<string> {
		const template = await this.loader.load(this.templatePath);
		const inertiaDom = this.renderInertiaDom(page);

		return template
			.replace(/@vite/g, assetTags)
			.replace(/@inertia/g, inertiaDom);
	}

	private renderInertiaDom(page: InertiaPage): string {
		const pageJson = escapeJson(JSON.stringify(page));
		const escaped = escapeAttribute(pageJson);
		return `<div id="app" data-page="${escaped}"></div>`;
	}
}
