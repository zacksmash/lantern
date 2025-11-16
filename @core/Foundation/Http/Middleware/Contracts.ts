import type { Token } from "@core/Container/Container";
import type { HttpRequest } from "@core/Http/Request";
import type { ResponseValue } from "@core/Http/ResponseFactory";

export type MiddlewareNext = (request: HttpRequest) => Promise<ResponseValue>;

export interface MiddlewareContract {
	handle(
		request: HttpRequest,
		next: MiddlewareNext,
		...parameters: string[]
	): Promise<ResponseValue>;
}

export type MiddlewareFunction = (
	request: HttpRequest,
	next: MiddlewareNext,
	...parameters: string[]
) => Promise<ResponseValue>;

export type MiddlewareContractConstructor = new (
	...args: any[]
) => MiddlewareContract;

export type MiddlewareIdentifier =
	| string
	| MiddlewareFunction
	| MiddlewareContractConstructor;

export interface MiddlewareSnapshot {
	cookies: {
		except: string[];
	};
	global: MiddlewareIdentifier[];
	groups: Record<string, MiddlewareIdentifier[]>;
	aliases: Record<string, MiddlewareIdentifier>;
}

export type MiddlewareResolver = <T>(token: Token<T>) => T;
