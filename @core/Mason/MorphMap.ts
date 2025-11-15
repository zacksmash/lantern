import type { Model } from "@core/Mason/Model";

const aliasToModel = new Map<string, typeof Model>();
const modelToAlias = new Map<typeof Model, string>();

export const registerMorphMap = (
	map: Record<string, typeof Model>,
	clearExisting = true,
) => {
	if (clearExisting) {
		aliasToModel.clear();
		modelToAlias.clear();
	}

	for (const [alias, model] of Object.entries(map)) {
		setMorphAlias(alias, model);
	}
};

export const setMorphAlias = (alias: string, model: typeof Model) => {
	aliasToModel.set(alias, model);
	modelToAlias.set(model, alias);
};

export const resolveMorphClass = (type: string): typeof Model | undefined => {
	return aliasToModel.get(type);
};

export const resolveMorphType = (model: typeof Model): string => {
	if (modelToAlias.has(model)) {
		return modelToAlias.get(model)!;
	}

	const alias = model.morphClass ?? snakeCase(model.name || "model");

	modelToAlias.set(model, alias);
	if (!aliasToModel.has(alias)) {
		aliasToModel.set(alias, model);
	}

	return alias;
};

const snakeCase = (value: string) => {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase();
};
