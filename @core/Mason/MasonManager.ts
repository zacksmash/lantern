import type { DatabaseManager } from "@core/Database/DatabaseManager";
import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import type { SQL } from "bun";

export interface MasonTransactionContext {
	readonly connection: SQL;
	query<M extends typeof Model>(model: M): MasonQueryBuilder<M>;
	raw<T = unknown>(
		strings: TemplateStringsArray,
		...values: unknown[]
	): Promise<T>;
}

export class MasonManager {
	constructor(private readonly database: DatabaseManager) {}

	connectionFor(model: typeof Model, override?: SQL): SQL {
		if (override) {
			return override;
		}

		const name = model.connection;
		return this.database.connection(name);
	}

	async transaction<T>(
		callback: (trx: MasonTransactionContext) => Promise<T> | T,
		connectionName?: string,
	): Promise<T> {
		const connection = this.database.connection(connectionName);
		return await connection.begin(async (sql) => {
			const context: MasonTransactionContext = {
				connection: sql,
				query: <M extends typeof Model>(model: M) => model.newQuery(sql),
				raw: (strings, ...values) => sql(strings, ...values),
			};

			return await callback(context);
		});
	}
}
