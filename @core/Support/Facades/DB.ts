import { ContainerTokens } from "@core/Application/ContainerTokens";
import { app } from "@root/bootstrap/app";
import type { SQL } from "bun";

type BindingArray = readonly unknown[];

const resolveManager = () => app.resolve(ContainerTokens.DatabaseManager);

const connection = (name?: string): SQL => {
	return resolveManager().connection(name);
};

const raw = (strings: TemplateStringsArray, ...values: unknown[]) => {
	return connection()(strings, ...values);
};

const using = async <T>(
	name: string,
	callback: (sql: SQL) => Promise<T> | T,
): Promise<T> => {
	const sql = connection(name);
	return await callback(sql);
};

const buildTemplate = (query: string, bindingsLength: number) => {
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

const runQuery = (sql: SQL, query: string, bindings: BindingArray) => {
	const template = buildTemplate(query, bindings.length);
	return sql(template, ...bindings);
};

const select = async (query: string, bindings: BindingArray = []) => {
	return await runQuery(connection(), query, bindings);
};

const selectOne = async (query: string, bindings: BindingArray = []) => {
	const rows = (await select(query, bindings)) as unknown[];
	return rows[0] ?? null;
};

const statement = (query: string, bindings: BindingArray = []) => {
	return runQuery(connection(), query, bindings);
};

const insert = statement;
const update = statement;
const destroy = statement;

const transaction = async <T>(
	callback: (sql: SQL) => Promise<T> | T,
): Promise<T> => {
	return await connection().begin(callback);
};

export const DB = Object.assign(connection, {
	connection,
	using,
	raw,
	select,
	selectOne,
	insert,
	update,
	delete: destroy,
	statement,
	transaction,
});

export const db = DB;
