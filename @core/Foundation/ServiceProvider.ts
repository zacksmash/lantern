import type { Token } from "@core/Container/Container";

export interface ApplicationContract {
	bind<T>(token: Token<T>, resolver: (app: ApplicationContract) => T): this;
	singleton<T>(
		token: Token<T>,
		resolver: (app: ApplicationContract) => T,
	): this;
	instance<T>(token: Token<T>, value: T): this;
	make<T>(token: Token<T>): T;
	booting(callback: () => void): void;
	booted(callback: () => void): void;
}

export type ServiceProviderConstructor<
	T extends ServiceProvider = ServiceProvider,
> = new (
	app: ApplicationContract,
) => T;

export abstract class ServiceProvider {
	constructor(protected readonly app: ApplicationContract) {}

	register(): void | Promise<void> {
		//
	}

	boot(): void | Promise<void> {
		//
	}

	booted(): void | Promise<void> {
		//
	}
}
