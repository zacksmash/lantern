export const buildSqlTemplate = (query: string, bindingsLength: number) => {
	const segments = query.split("?");
	if (segments.length - 1 !== bindingsLength) {
		throw new Error(
			`Query "${query}" expects ${segments.length - 1} bindings but ${bindingsLength} were provided.`,
		);
	}

	const template = segments as unknown as TemplateStringsArray;
	(template as unknown as { raw: readonly string[] }).raw = segments;
	return template;
};
