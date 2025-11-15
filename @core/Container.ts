import { getDesignParamTypes, getParamTokens } from "@core/Container/Metadata";

export type Constructor<T = unknown> = new (...args: any[]) => T;
export type Token<T = unknown> = string | symbol | Constructor<T>;
export type Factory<T> = () => T;
export type FactoryLike<T> = Factory<T> | Constructor<T>;
type AnyToken = Token<unknown>;
type AnyFactory = Factory<unknown>;
type ScopeMap = Map<AnyToken, unknown>;
type InjectableConstructor<T = unknown> = Constructor<T> & {
	inject?: Token[];
};

export class Container {
	protected bindings = new Map<AnyToken, AnyFactory>();
	protected singletons = new Map<AnyToken, AnyFactory>();
	protected singletonInstances = new Map<AnyToken, unknown>();
	protected instances = new Map<AnyToken, unknown>();
	protected scopedBindings = new Map<AnyToken, AnyFactory>();
	private resolving = new Set<AnyToken>();
	private scopeStack: ScopeMap[] = [];

	bind<T>(identifier: Token<T>, factory: FactoryLike<T>): void {
		this.bindings.set(identifier, this.normalizeFactory(factory));
	}

	singleton<T>(identifier: Token<T>, factory: FactoryLike<T>): void {
		this.singletons.set(identifier, this.normalizeFactory(factory));
	}

	instance<T>(identifier: Token<T>, value: T): void {
		this.instances.set(identifier, value);
	}

	scoped<T>(identifier: Token<T>, factory: FactoryLike<T>): void {
		this.scopedBindings.set(identifier, this.normalizeFactory(factory));
	}

	has(identifier: Token): boolean {
		return (
			this.instances.has(identifier) ||
			this.singletonInstances.has(identifier) ||
			this.singletons.has(identifier) ||
			this.bindings.has(identifier)
		);
	}

	resolve<T>(identifier: Token<T>): T {
		if (this.instances.has(identifier)) {
			return this.instances.get(identifier) as T;
		}

		if (this.singletonInstances.has(identifier)) {
			return this.singletonInstances.get(identifier) as T;
		}

		if (this.singletons.has(identifier)) {
			const factory = this.singletons.get(identifier)! as Factory<T>;
			const instance = this.invokeFactory(factory);
			this.singletonInstances.set(identifier, instance);
			return instance;
		}

		if (this.bindings.has(identifier)) {
			const binding = this.bindings.get(identifier)! as Factory<T>;
			return this.invokeFactory(binding);
		}

		if (this.scopedBindings.has(identifier)) {
			return this.resolveScoped(identifier);
		}

		if (typeof identifier === "function") {
			return this.build(identifier);
		}

		throw new Error(`Identifier ${String(identifier)} not found in container.`);
	}

	protected invokeFactory<T>(factory: Factory<T>): T {
		return factory();
	}

	private normalizeFactory<T>(factory: FactoryLike<T>): Factory<T> {
		if (isConstructor(factory)) {
			const ctor = factory as Constructor<T>;
			return () => this.build(ctor);
		}

		return factory as Factory<T>;
	}

	protected build<T>(ctor: Constructor<T>): T {
		if (this.resolving.has(ctor)) {
			throw new Error(
				`Circular dependency detected while resolving ${ctor.name || "anonymous class"}.`,
			);
		}

		this.resolving.add(ctor);
		try {
			const dependencies = this.resolveDependencies(ctor);
			const resolvedDependencies = dependencies.map((token) =>
				this.resolve(token as Token<unknown>),
			);
			return new ctor(...resolvedDependencies);
		} finally {
			this.resolving.delete(ctor);
		}
	}

	runScope<T>(callback: () => T | Promise<T>): Promise<T> | T {
		this.scopeStack.push(new Map<AnyToken, unknown>());
		const finalize = () => {
			this.scopeStack.pop();
		};

		try {
			const result = callback();
			if (result instanceof Promise) {
				return result.finally(finalize);
			}
			finalize();
			return result;
		} catch (error) {
			finalize();
			throw error;
		}
	}

	private resolveDependencies<T>(ctor: Constructor<T>): Token[] {
		if (hasInjectTokens(ctor)) {
			return ctor.inject ?? [];
		}

		const paramTokens = getParamTokens(ctor);
		const designTypes = getDesignParamTypes(ctor);

		if (!paramTokens && !designTypes) {
			return [];
		}

		const designLength = designTypes?.length ?? 0;
		const paramLength = paramTokens
			? Math.max(...Object.keys(paramTokens).map((key) => Number(key)), -1) + 1
			: 0;
		const maxLength = Math.max(designLength, paramLength);

		const dependencies: Token[] = [];

		for (let i = 0; i < maxLength; i++) {
			const token = paramTokens?.[i] ?? designTypes?.[i];

			if (!token || token === Object) {
				throw new Error(
					`Unable to resolve dependency at position ${i} for ${ctor.name || "anonymous class"}. Use @Inject(...) or static inject.`,
				);
			}

			dependencies.push(token);
		}

		return dependencies;
	}

	private resolveScoped<T>(identifier: Token<T>): T {
		const scope = this.scopeStack[this.scopeStack.length - 1];
		if (!scope) {
			throw new Error(
				`Attempted to resolve scoped service "${String(identifier)}" outside of a scope.`,
			);
		}

		if (scope.has(identifier)) {
			return scope.get(identifier) as T;
		}

		const factory = this.scopedBindings.get(identifier)! as Factory<T>;
		const instance = this.invokeFactory(factory);
		scope.set(identifier, instance);
		return instance;
	}
}

const isConstructor = <T>(value: unknown): value is Constructor<T> => {
	return (
		typeof value === "function" && Boolean((value as Constructor).prototype)
	);
};

const hasInjectTokens = <T>(
	ctor: Constructor<T>,
): ctor is InjectableConstructor<T> => {
	return Array.isArray((ctor as InjectableConstructor<T>).inject);
};
