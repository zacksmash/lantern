export type MiddlewareIdentifier =
	| string
	| { new (...args: any[]): unknown }
	| ((...args: any[]) => unknown);

export interface CookieEncryptionConfig {
	except?: string[];
}

export interface MiddlewareStackMutation {
	append?: MiddlewareIdentifier[];
	prepend?: MiddlewareIdentifier[];
	remove?: MiddlewareIdentifier[];
	replace?: MiddlewareIdentifier[];
}

export interface MiddlewareSnapshot {
	cookies: Required<CookieEncryptionConfig>;
	web: Required<MiddlewareStackMutation>;
}

export class MiddlewareManager {
	private cookieConfig: Required<CookieEncryptionConfig> = {
		except: [],
	};

	private webConfig: Required<MiddlewareStackMutation> = {
		append: [],
		prepend: [],
		remove: [],
		replace: [],
	};

	encryptCookies(config: CookieEncryptionConfig): this {
		this.cookieConfig = {
			except: Array.from(new Set(config.except ?? [])),
		};

		return this;
	}

	web(config: MiddlewareStackMutation): this {
		this.webConfig = {
			append: config.append ?? [],
			prepend: config.prepend ?? [],
			remove: config.remove ?? [],
			replace: config.replace ?? [],
		};

		return this;
	}

	snapshot(): MiddlewareSnapshot {
		return {
			cookies: { ...this.cookieConfig },
			web: {
				append: [...this.webConfig.append],
				prepend: [...this.webConfig.prepend],
				remove: [...this.webConfig.remove],
				replace: [...this.webConfig.replace],
			},
		};
	}
}

export type MiddleWare = MiddlewareManager;
