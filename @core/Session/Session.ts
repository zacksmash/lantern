import { randomBytes } from "node:crypto";

export interface FlashBag {
	new: string[];
	old: string[];
}

export interface SessionData {
	[key: string]: unknown;
	_flash?: FlashBag;
}

export class Session {
	private data: SessionData;
	private previousId: string | null = null;
	private started = false;

	constructor(
		private id: string,
		data?: SessionData,
	) {
		this.data = data ?? {};
	}

	getId(): string {
		return this.id;
	}

	get<T = unknown>(key: string, fallback?: T): T | undefined {
		return (this.data[key] as T) ?? fallback;
	}

	put<T = unknown>(key: string, value: T) {
		this.started = true;
		this.data[key] = value;
	}

	all(): SessionData {
		return { ...this.data };
	}

	has(key: string): boolean {
		return Object.hasOwn(this.data, key);
	}

	forget(key: string) {
		if (this.has(key)) {
			this.started = true;
			delete this.data[key];
		}
	}

	flush() {
		this.data = {};
		this.started = true;
	}

	regenerate(nextId?: string): string {
		this.previousId = this.id;
		this.id = nextId ?? Session.generateId();
		return this.id;
	}

	getPreviousId(): string | null {
		return this.previousId;
	}

	consumePreviousId(): string | null {
		const id = this.previousId;
		this.previousId = null;
		return id;
	}

	remember<T = unknown>(key: string, callback: () => T): T {
		if (!this.has(key)) {
			const value = callback();
			this.put(key, value);
		}

		return this.get(key) as T;
	}

	flash(key: string, value: unknown) {
		this.put(key, value);
		this.pushToFlash("new", key);
	}

	now(key: string, value: unknown) {
		this.put(key, value);
		this.pushToFlash("new", key);
		this.pushToFlash("old", key);
	}

	reflash() {
		const flash = this.getFlashBag();
		flash.new = flash.new.concat(flash.old);
		flash.old = [];
		this.data._flash = flash;
	}

	keep(keys: string | string[]) {
		const flash = this.getFlashBag();
		const list = Array.isArray(keys) ? keys : [keys];

		for (const key of list) {
			if (!flash.new.includes(key)) {
				flash.new.push(key);
			}
		}

		this.data._flash = flash;
	}

	ageFlashData() {
		const flash = this.getFlashBag();
		for (const key of flash.old) {
			delete this.data[key];
		}
		flash.old = flash.new;
		flash.new = [];
		this.data._flash = flash;
	}

	token(): string {
		return this.remember("_token", () => randomBytes(20).toString("hex"));
	}

	hasChanges(): boolean {
		return this.started;
	}

	toJSON(): SessionData {
		return { ...this.data };
	}

	private getFlashBag(): FlashBag {
		const flash = this.data._flash;
		if (flash && typeof flash === "object") {
			return {
				new: Array.isArray(flash.new) ? flash.new.slice() : [],
				old: Array.isArray(flash.old) ? flash.old.slice() : [],
			};
		}

		return { new: [], old: [] };
	}

	private pushToFlash(bucket: "new" | "old", key: string) {
		const flash = this.getFlashBag();
		if (!flash[bucket].includes(key)) {
			flash[bucket].push(key);
		}
		this.data._flash = flash;
	}

	static generateId(): string {
		return randomBytes(20).toString("hex");
	}
}
