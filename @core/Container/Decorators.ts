import type { Token } from "@core/Container";
import { defineParamToken } from "@core/Container/Metadata";

export function Injectable(tokens?: Token[]): ClassDecorator {
	return (target) => {
		if (tokens && tokens.length > 0) {
			(target as any).inject = tokens;
		}
	};
}

export function Inject(token: Token): ParameterDecorator {
	return (target, _propertyKey, parameterIndex) => {
		const actualTarget =
			typeof target === "function" ? target : target.constructor;
		defineParamToken(actualTarget, parameterIndex, token);
	};
}
