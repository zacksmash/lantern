export class Container {
  protected bindings = new Map<string, any>();
  protected singletons = new Map<string, any>();
  protected instances = new Map<string, any>();

  // Register a factory (new instance every resolve)
  bind<T>(identifier: string, factory: () => T): void {
    this.bindings.set(identifier, factory);
  }

  // Register a factory that resolves once
  singleton<T>(identifier: string, factory: () => T): void {
    this.singletons.set(identifier, factory);
  }

  // Register a literal value or object
  instance<T>(identifier: string, value: T): void {
    this.instances.set(identifier, value);
  }

  resolve<T>(identifier: string): T {
    // If literal instance
    if (this.instances.has(identifier)) {
      return this.instances.get(identifier);
    }

    // If singleton
    if (this.singletons.has(identifier)) {
      const factory = this.singletons.get(identifier);

      // If already created
      const existing = this.bindings.get(identifier);
      if (existing && typeof existing !== "function") {
        return existing;
      }

      // Create singleton once
      const instance = factory();
      this.bindings.set(identifier, instance);
      return instance;
    }

    // If factory binding
    if (this.bindings.has(identifier)) {
      const binding = this.bindings.get(identifier);

      if (typeof binding === "function") {
        return binding();
      }

      return binding; // raw object
    }

    throw new Error(`Identifier ${identifier} not found in container.`);
  }
}
