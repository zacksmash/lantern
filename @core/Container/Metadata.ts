import "@core/Support/Reflect";
import type { Token } from "@core/Container";

const PARAM_METADATA_KEY = Symbol("container:param_tokens");
const DESIGN_PARAMTYPES_KEY = "design:paramtypes";

type MetadataTarget = object;

export const defineParamToken = (
	target: MetadataTarget,
	index: number,
	token: Token,
) => {
	const existing =
		(Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) as
			| Record<number, Token>
			| undefined) ?? {};

	existing[index] = token;
	Reflect.defineMetadata(PARAM_METADATA_KEY, existing, target);
};

export const getParamTokens = (target: MetadataTarget) => {
	return Reflect.getOwnMetadata(PARAM_METADATA_KEY, target) as
		| Record<number, Token>
		| undefined;
};

export const getDesignParamTypes = (target: MetadataTarget) => {
	if (typeof Reflect.getMetadata !== "function") return undefined;
	return Reflect.getMetadata(DESIGN_PARAMTYPES_KEY, target) as
		| Token[]
		| undefined;
};
