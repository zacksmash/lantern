import type { Token } from "@core/Container";

export const createToken = <T>(description: string): Token<T> => {
	return Symbol(description) as Token<T>;
};
