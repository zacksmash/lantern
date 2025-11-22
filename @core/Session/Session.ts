export type SessionData = Record<string, unknown>;

export interface SessionStore {
	read(id: string): Promise<SessionData | null>;
	write(id: string, data: SessionData, ttlMinutes: number): Promise<void>;
	destroy(id: string): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
	private store = new Map<string, { data: SessionData; expiresAt: number }>();

	async read(id: string): Promise<SessionData | null> {
		const record = this.store.get(id);
		if (!record) return null;
		if (Date.now() > record.expiresAt) {
			this.store.delete(id);
			return null;
		}

		return { ...record.data };
	}

	async write(
		id: string,
		data: SessionData,
		ttlMinutes: number,
	): Promise<void> {
		const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
		this.store.set(id, { data: { ...data }, expiresAt });
	}

	async destroy(id: string): Promise<void> {
		this.store.delete(id);
	}
}

export class Session {
	constructor(
		private readonly id: string,
		private readonly store: SessionStore,
		private readonly ttlMinutes: number,
		private data: SessionData = {},
	) {}

	static async load(
		id: string,
		store: SessionStore,
		ttlMinutes: number,
	): Promise<Session> {
		const data = (await store.read(id)) ?? {};
		return new Session(id, store, ttlMinutes, data);
	}

	all(): SessionData {
		return { ...this.data };
	}

	get<T = unknown>(key: string, defaultValue?: T): T | undefined {
		return (this.data[key] as T) ?? defaultValue;
	}

	put(key: string, value: unknown): void {
		this.data[key] = value;
	}

	forget(key: string): void {
		delete this.data[key];
	}

	idValue(): string {
		return this.id;
	}

	async save(): Promise<void> {
		await this.store.write(this.id, this.data, this.ttlMinutes);
	}
}
