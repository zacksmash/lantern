import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface ManifestEntry {
	file: string;
	css?: string[];
	imports?: string[];
}

type Manifest = Record<string, ManifestEntry>;

const escapeAttr = (value: string) =>
	value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export class ViteAssetTagGenerator {
	private manifestCache: { raw: string; data: Manifest } | null = null;
	private versionCache: string | null = null;

	constructor(
		private entry: string = "assets/js/app.ts",
		private publicDir: string = join(process.cwd(), "public"),
		private buildDirectory: string = "build",
	) {}

	async generateTags(): Promise<string> {
		const hotUrl = await this.readHotUrl();

		if (hotUrl) {
			return this.generateHotTags(hotUrl);
		}

		const manifest = await this.loadManifest();
		return this.generateManifestTags(manifest);
	}

	async getVersion(): Promise<string> {
		const hotUrl = await this.readHotUrl();
		if (hotUrl) {
			return "dev";
		}

		if (this.versionCache) return this.versionCache;

		const manifest = await this.loadManifest();
		const raw = this.manifestCache?.raw ?? JSON.stringify(manifest);
		const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
		this.versionCache = hash;
		return hash;
	}

	private async readHotUrl(): Promise<string | null> {
		const hotPath = join(this.publicDir, "hot");
		if (!existsSync(hotPath)) return null;

		try {
			const contents = await readFile(hotPath, "utf8");
			return contents.trim();
		} catch {
			return null;
		}
	}

	private async loadManifest(): Promise<Manifest> {
		if (this.manifestCache) {
			return this.manifestCache.data;
		}

		const manifestPath = join(
			this.publicDir,
			this.buildDirectory,
			"manifest.json",
		);

		const raw = await readFile(manifestPath, "utf8");
		const data = JSON.parse(raw) as Manifest;
		this.manifestCache = { raw, data };
		return data;
	}

	private generateHotTags(hotUrl: string): string {
		const normalizedUrl = hotUrl.replace(/\/+$/, "");
		const client = `<script type="module" src="${escapeAttr(`${normalizedUrl}/@vite/client`)}"></script>`;
		const entryScript = `<script type="module" src="${escapeAttr(`${normalizedUrl}/${this.entry}`)}"></script>`;
		return `${client}\n${entryScript}`;
	}

	private generateManifestTags(manifest: Manifest): string {
		const entry = manifest[this.entry];
		if (!entry) {
			throw new Error(
				`Vite manifest is missing the "${this.entry}" entry. Did you build your assets?`,
			);
		}

		const tags: string[] = [];
		const base = `/build`;

		(entry.imports ?? []).forEach((importKey) => {
			const importEntry = manifest[importKey];
			if (importEntry?.file) {
				tags.push(
					`<link rel="modulepreload" href="${escapeAttr(`${base}/${importEntry.file}`)}">`,
				);
			}
		});

		(entry.css ?? []).forEach((cssFile) => {
			tags.push(
				`<link rel="stylesheet" href="${escapeAttr(`${base}/${cssFile}`)}">`,
			);
		});

		tags.push(
			`<script type="module" src="${escapeAttr(`${base}/${entry.file}`)}"></script>`,
		);

		return tags.join("\n");
	}
}
