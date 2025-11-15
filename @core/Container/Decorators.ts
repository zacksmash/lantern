import type { Constructor, Token } from "@core/Container";
import { defineParamToken } from "@core/Container/Metadata";

type InjectableClass = Constructor & { inject?: Token[] };

export function Injectable(tokens?: Token[]): ClassDecorator {
	return (target) => {
		if (!tokens?.length) {
			return;
		}

		const ctor = target as unknown as InjectableClass;
		Object.defineProperty(ctor, "inject", {
			value: tokens.slice(),
			writable: true,
			configurable: true,
		});
	};
}

export function Inject(token: Token): ParameterDecorator {
	return (target, _propertyKey, parameterIndex) => {
		const actualTarget =
			typeof target === "function" ? target : target.constructor;
		defineParamToken(actualTarget, parameterIndex, token);
	};
}
