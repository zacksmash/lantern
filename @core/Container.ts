export class Container {
	protected bindings = new Map<string, any>();
	protected singletons = new Map<string, any>();
	protected instances = new Map<string, any>();

	bind<T>(identifier: string, factory: () => T): void {
		this.bindings.set(identifier, factory);
	}

	singleton<T>(identifier: string, factory: () => T): void {
		this.singletons.set(identifier, factory);
	}

	instance<T>(identifier: string, value: T): void {
		this.instances.set(identifier, value);
	}

	resolve<T>(identifier: string): T {
		if (this.instances.has(identifier)) {
			return this.instances.get(identifier);
		}

		if (this.singletons.has(identifier)) {
			const factory = this.singletons.get(identifier);

			const existing = this.bindings.get(identifier);
			if (existing && typeof existing !== "function") {
				return existing;
			}

			const instance = factory();
			this.bindings.set(identifier, instance);
			return instance;
		}

		if (this.bindings.has(identifier)) {
			const binding = this.bindings.get(identifier);

			if (typeof binding === "function") {
				return binding();
			}

			return binding;
		}

		throw new Error(`Identifier ${identifier} not found in container.`);
	}
}
