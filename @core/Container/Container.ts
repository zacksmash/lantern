import type { Application } from "@core/Foundation/Application";

export type Constructable<T> = new (...args: any[]) => T;
export type Token<T = unknown> = string | symbol | Constructable<T>;
export type Resolver<T> = (app: Application) => T;

interface Binding<T = unknown> {
	resolver: Resolver<T>;
	singleton: boolean;
	instance?: T;
}

export class Container {
	private readonly bindings = new Map<Token, Binding>();

	constructor(private readonly app: Application) {}

	bind<T>(token: Token<T>, resolver: Resolver<T>): this {
		this.bindings.set(token, {
			resolver,
			singleton: false,
		});
		return this;
	}

	singleton<T>(token: Token<T>, resolver: Resolver<T>): this {
		this.bindings.set(token, {
			resolver,
			singleton: true,
		});
		return this;
	}

	instance<T>(token: Token<T>, value: T): this {
		this.bindings.set(token, {
			resolver: () => value,
			singleton: true,
			instance: value,
		});
		return this;
	}

	make<T>(token: Token<T>): T {
		if (this.bindings.has(token)) {
			return this.resolveBinding(token);
		}

		if (typeof token === "function") {
			return new (token as Constructable<T>)();
		}

		throw new Error(`Container cannot resolve token: ${String(token)}`);
	}

	has(token: Token): boolean {
		return this.bindings.has(token);
	}

	private resolveBinding<T>(token: Token<T>): T {
		const binding = this.bindings.get(token) as Binding<T>;

		if (binding.singleton) {
			if (binding.instance !== undefined) {
				return binding.instance;
			}

			const resolved = binding.resolver(this.app);
			binding.instance = resolved;
			return resolved;
		}

		return binding.resolver(this.app);
	}
}
