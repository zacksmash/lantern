export class Container {
	private bindings = new Map();
	private singletons = new Map();

	bind(key: string, factory: () => any) {
		this.bindings.set(key, factory);
	}

	singleton(key: string, factory: () => any) {
		this.bindings.set(key, factory);
		this.singletons.set(key, null);
	}

	make<T = any>(key: string): T {
		// If it's a singleton and already created → return
		if (this.singletons.has(key)) {
			const existing = this.singletons.get(key);
			if (existing) return existing;

			const instance = this.bindings.get(key)();
			this.singletons.set(key, instance);
			return instance;
		}

		// Normal binding
		return this.bindings.get(key)();
	}
}
