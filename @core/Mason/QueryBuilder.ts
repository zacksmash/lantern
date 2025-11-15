// @ts-nocheck
import type { MasonManager } from "@core/Mason/MasonManager";
import type { AttributesOf, Model } from "@core/Mason/Model";
import { buildSqlTemplate } from "@core/Mason/Sql";
import type { SQL } from "bun";

type Attributes<M extends typeof Model> = AttributesOf<M>;
type Instance<M extends typeof Model> = InstanceType<M>;
type RelationName<_M extends typeof Model> = string;

type RelationConstraint = (query: MasonQueryBuilder<typeof Model>) => void;

type OrderDirection = "asc" | "desc";

type WhereBoolean = "and" | "or";

type WhereClause<M extends typeof Model> =
	| {
			type: "Basic";
			column: keyof Attributes<M> & string;
			operator: string;
			value: unknown;
			boolean: WhereBoolean;
	  }
	| {
			type: "Null";
			column: keyof Attributes<M> & string;
			boolean: WhereBoolean;
			not: boolean;
	  }
	| {
			type: "In";
			column: keyof Attributes<M> & string;
			values: unknown[];
			boolean: WhereBoolean;
			not: boolean;
	  }
	| {
			type: "Nested";
			query: MasonQueryBuilder<M>;
			boolean: WhereBoolean;
	  }
	| {
			type: "Raw";
			sql: string;
			bindings: unknown[];
			boolean: WhereBoolean;
	  };

type CompiledQuery = {
	sql: string;
	bindings: unknown[];
};

type AggregateType = {
	function: "count";
	column?: string;
};

export class MasonQueryBuilder<M extends typeof Model> {
	private columns: string[] = ["*"];
	private wheres: WhereClause<M>[] = [];
	private orders: {
		column: keyof Attributes<M> & string;
		direction: OrderDirection;
	}[] = [];
	private eagerLoads = new Map<
		string,
		Array<(query: MasonQueryBuilder<any>) => void>
	>();
	private limitValue?: number;
	private offsetValue?: number;
	private aggregate?: AggregateType;

	constructor(
		private readonly model: M,
		private readonly manager: MasonManager,
		private connectionOverride?: SQL,
	) {}

	select<K extends keyof Attributes<M> & string>(...columns: K[]): this {
		if (!columns.length) return this;
		this.columns = columns;
		return this;
	}

	where<K extends keyof Attributes<M> & string>(
		column: K,
		value: Attributes<M>[K],
	): this;
	where<K extends keyof Attributes<M> & string>(
		column: K,
		operator: string,
		value: Attributes<M>[K],
	): this;
	where(callback: (query: MasonQueryBuilder<M>) => void): this;
	where(
		columnOrCallback:
			| (keyof Attributes<M> & string)
			| ((query: MasonQueryBuilder<M>) => void),
		operatorOrValue?: string | Attributes<M>[keyof Attributes<M>],
		value?: Attributes<M>[keyof Attributes<M>],
	): this {
		return this.addWhere(columnOrCallback, operatorOrValue, value, "and");
	}

	orWhere<K extends keyof Attributes<M> & string>(
		column: K,
		value: Attributes<M>[K],
	): this;
	orWhere<K extends keyof Attributes<M> & string>(
		column: K,
		operator: string,
		value: Attributes<M>[K],
	): this;
	orWhere(callback: (query: MasonQueryBuilder<M>) => void): this;
	orWhere(
		columnOrCallback:
			| (keyof Attributes<M> & string)
			| ((query: MasonQueryBuilder<M>) => void),
		operatorOrValue?: string | Attributes<M>[keyof Attributes<M>],
		value?: Attributes<M>[keyof Attributes<M>],
	): this {
		return this.addWhere(columnOrCallback, operatorOrValue, value, "or");
	}

	private addWhere(
		columnOrCallback:
			| (keyof Attributes<M> & string)
			| ((query: MasonQueryBuilder<M>) => void),
		operatorOrValue: string | Attributes<M>[keyof Attributes<M>] = "=",
		value?: Attributes<M>[keyof Attributes<M>],
		boolean: WhereBoolean = "and",
	): this {
		if (typeof columnOrCallback === "function") {
			const nested = this.forNested();
			columnOrCallback(nested);
			if (nested.wheres.length) {
				this.wheres.push({
					type: "Nested",
					query: nested,
					boolean,
				});
			}
			return this;
		}

		let operator = "=";
		let actualValue: unknown = value;

		if (value === undefined) {
			actualValue = operatorOrValue;
		} else {
			operator = operatorOrValue as string;
		}

		this.wheres.push({
			type: "Basic",
			column: columnOrCallback,
			operator,
			value: actualValue,
			boolean,
		});

		return this;
	}

	whereNull<K extends keyof Attributes<M> & string>(column: K): this {
		this.wheres.push({
			type: "Null",
			column,
			boolean: "and",
			not: false,
		});
		return this;
	}

	orWhereNull<K extends keyof Attributes<M> & string>(column: K): this {
		this.wheres.push({
			type: "Null",
			column,
			boolean: "or",
			not: false,
		});
		return this;
	}

	whereNotNull<K extends keyof Attributes<M> & string>(column: K): this {
		this.wheres.push({
			type: "Null",
			column,
			boolean: "and",
			not: true,
		});
		return this;
	}

	whereIn<K extends keyof Attributes<M> & string>(
		column: K,
		values: readonly Attributes<M>[K][],
	): this {
		this.wheres.push({
			type: "In",
			column,
			values: [...values],
			boolean: "and",
			not: false,
		});
		return this;
	}

	orWhereIn<K extends keyof Attributes<M> & string>(
		column: K,
		values: readonly Attributes<M>[K][],
	): this {
		this.wheres.push({
			type: "In",
			column,
			values: [...values],
			boolean: "or",
			not: false,
		});
		return this;
	}

	whereNotIn<K extends keyof Attributes<M> & string>(
		column: K,
		values: readonly Attributes<M>[K][],
	): this {
		this.wheres.push({
			type: "In",
			column,
			values: [...values],
			boolean: "and",
			not: true,
		});
		return this;
	}

	whereRaw(sql: string, bindings: unknown[] = []): this {
		this.wheres.push({
			type: "Raw",
			sql,
			bindings,
			boolean: "and",
		});
		return this;
	}

	orderBy<K extends keyof Attributes<M> & string>(
		column: K,
		direction: OrderDirection = "asc",
	): this {
		this.orders.push({ column, direction });
		return this;
	}

	latest(): this {
		return this.orderBy(
			(this.model.updatedAtColumn ??
				(this.model.primaryKey as keyof Attributes<M> &
					string)) as keyof Attributes<M> & string,
			"desc",
		);
	}

	oldest(): this {
		return this.orderBy(
			(this.model.createdAtColumn ??
				(this.model.primaryKey as keyof Attributes<M> &
					string)) as keyof Attributes<M> & string,
			"asc",
		);
	}

	limit(value: number): this {
		this.limitValue = value;
		return this;
	}

	offset(value: number): this {
		this.offsetValue = value;
		return this;
	}

	whereKey(value: unknown): this {
		return this.where(
			this.model.primaryKey as keyof Attributes<M> & string,
			value as Attributes<M>[keyof Attributes<M> & string],
		);
	}

	with(
		relationOrRelations:
			| RelationName<M>
			| string
			| ReadonlyArray<
					| RelationName<M>
					| string
					| [RelationName<M> | string, RelationConstraint]
			  >,
		constraint?: RelationConstraint,
	): this {
		if (Array.isArray(relationOrRelations)) {
			for (const relation of relationOrRelations) {
				if (Array.isArray(relation)) {
					const [name, callback] = relation;
					if (typeof name === "string" && name.includes(".")) {
						this.addNestedWith(name, callback);
					} else {
						this.addEagerLoad(name as RelationName<M>, callback);
					}
				} else {
					if (typeof relation === "string" && relation.includes(".")) {
						this.addNestedWith(relation);
					} else {
						this.addEagerLoad(relation as RelationName<M>);
					}
				}
			}
			return this;
		}

		if (
			typeof relationOrRelations === "string" &&
			relationOrRelations.includes(".")
		) {
			return this.addNestedWith(relationOrRelations, constraint);
		}

		this.addEagerLoad(relationOrRelations as RelationName<M>, constraint);
		return this;
	}

	async get(): Promise<Instance<M>[]> {
		const rows = await this.runSelect();
		const models = this.model.hydrate(rows);
		await this.eagerLoadRelations(models);
		return models;
	}

	async first(): Promise<Instance<M> | null> {
		const clone = this.clone();
		clone.limit(1);
		const results = await clone.get();
		return results[0] ?? null;
	}

	async firstOrFail(): Promise<Instance<M>> {
		const model = await this.first();
		if (!model) {
			throw new Error("Model not found.");
		}
		return model;
	}

	async count(
		column: (keyof Attributes<M> & string) | "*" = "*",
	): Promise<number> {
		const clone = this.clone();
		clone.aggregate = {
			function: "count",
			column: column === "*" ? undefined : column,
		};
		const rows = await clone.runSelect();
		const aggregateRow = rows[0] as { aggregate?: number } | undefined;
		return Number(aggregateRow?.aggregate ?? 0);
	}

	async exists(): Promise<boolean> {
		const clone = this.clone();
		clone.selectRaw("1");
		clone.limit(1);
		const rows = await clone.runSelectRaw();
		return rows.length > 0;
	}

	async create(attributes: Partial<Attributes<M>>): Promise<Instance<M>> {
		const prepared = this.prepareAttributes(attributes);
		const { sql, bindings } = this.compileInsert(prepared);
		const result = await this.runStatement(sql, bindings);
		const keyName = this.model.primaryKey as keyof Attributes<M> & string;

		const insertedKey =
			(prepared as Record<string, unknown>)[keyName] ??
			result.lastInsertRowid ??
			result.insertId ??
			result.insertID ??
			result[keyName as keyof typeof result];

		if (insertedKey === undefined || insertedKey === null) {
			const instance = this.model.newInstance(prepared, true);
			instance.markClean();
			return instance;
		}

		const fresh = await this.model
			.newQuery(this.connectionOverride)
			.whereKey(insertedKey)
			.first();

		if (!fresh) {
			const instance = this.model.newInstance(
				{
					...prepared,
					[keyName]: insertedKey,
				} as Attributes<M>,
				true,
			);
			instance.markClean();
			return instance;
		}

		return fresh;
	}

	async update(values: Partial<Attributes<M>>): Promise<number> {
		const payload = this.preparePartialAttributes(values);
		if (!Object.keys(payload).length) return 0;

		const { sql, bindings } = this.compileUpdate(payload);
		const result = await this.runStatement(sql, bindings);
		return this.resolveAffectedRows(result);
	}

	async delete(): Promise<number> {
		const { sql, bindings } = this.compileDelete();
		const result = await this.runStatement(sql, bindings);
		return this.resolveAffectedRows(result);
	}

	selectRaw(sql: string): this {
		this.columns = [sql];
		return this;
	}

	private addNestedWith(name: string, constraint?: RelationConstraint): this {
		const [relation, ...nested] = name.split(".");
		const relationName = relation as RelationName<M>;
		this.addEagerLoad(relationName, (query) => {
			if (constraint) {
				constraint(query as MasonQueryBuilder<any>);
			}
			query.with(nested.join("."));
		});
		return this;
	}

	private addEagerLoad<K extends RelationName<M>>(
		name: K,
		constraint?: RelationConstraint,
	) {
		if (!this.eagerLoads.has(name)) {
			this.eagerLoads.set(name, []);
		}

		if (constraint) {
			this.eagerLoads.get(name)!.push(constraint);
		} else {
			this.eagerLoads.get(name)!;
		}
	}

	private async eagerLoadRelations(models: Instance<M>[]) {
		if (!models.length || !this.eagerLoads.size) {
			return;
		}

		for (const [name, constraints] of this.eagerLoads.entries()) {
			const relationName = name as RelationName<M>;
			const relation = this.model.relationInstance(relationName);
			await relation.eagerLoad(models, relationName, (query) => {
				for (const constraint of constraints) {
					constraint(query);
				}
			});
		}
	}

	private prepareAttributes(attributes: Partial<Attributes<M>>): Attributes<M> {
		const prepared = { ...(attributes as Attributes<M>) };

		if (this.model.timestamps) {
			const timestamp = new Date().toISOString();
			const created = this.model.createdAtColumn;
			const updated = this.model.updatedAtColumn;

			if (created && prepared[created as keyof Attributes<M>] === undefined) {
				prepared[created as keyof Attributes<M>] =
					timestamp as Attributes<M>[keyof Attributes<M>];
			}

			if (updated) {
				prepared[updated as keyof Attributes<M>] =
					timestamp as Attributes<M>[keyof Attributes<M>];
			}
		}

		return prepared;
	}

	private preparePartialAttributes(
		attributes: Partial<Attributes<M>>,
	): Partial<Attributes<M>> {
		const prepared = { ...attributes };

		if (this.model.timestamps && this.model.updatedAtColumn) {
			prepared[this.model.updatedAtColumn as keyof Attributes<M>] =
				new Date().toISOString() as Attributes<M>[keyof Attributes<M>];
		}

		return prepared;
	}

	private compileSelect(): CompiledQuery {
		if (this.aggregate) {
			return this.compileAggregate();
		}

		const columns = this.columns.length > 0 ? this.columns.join(", ") : "*";
		let sql = `select ${columns} from ${this.model.getTable()}`;
		const bindings: unknown[] = [];

		if (this.wheres.length) {
			const { clause, bindings: whereBindings } = this.compileWheres();
			sql += ` where ${clause}`;
			bindings.push(...whereBindings);
		}

		if (this.orders.length) {
			const orderClause = this.orders
				.map((order) => `${order.column} ${order.direction.toUpperCase()}`)
				.join(", ");
			sql += ` order by ${orderClause}`;
		}

		if (this.limitValue !== undefined) {
			sql += ` limit ${this.limitValue}`;
		}

		if (this.offsetValue !== undefined) {
			sql += ` offset ${this.offsetValue}`;
		}

		return { sql, bindings };
	}

	private compileAggregate(): CompiledQuery {
		const column = this.aggregate?.column ?? "*";
		let sql = `select ${this.aggregate?.function.toUpperCase()}(${column}) as aggregate from ${this.model.getTable()}`;
		const bindings: unknown[] = [];

		if (this.wheres.length) {
			const { clause, bindings: whereBindings } = this.compileWheres();
			sql += ` where ${clause}`;
			bindings.push(...whereBindings);
		}

		return { sql, bindings };
	}

	private compileWheres(): { clause: string; bindings: unknown[] } {
		const segments: string[] = [];
		const bindings: unknown[] = [];

		for (const where of this.wheres) {
			const bool =
				segments.length === 0 ? "" : ` ${where.boolean.toUpperCase()} `;

			switch (where.type) {
				case "Basic":
					segments.push(`${bool}${where.column} ${where.operator} ?`);
					bindings.push(where.value);
					break;
				case "Null":
					segments.push(
						`${bool}${where.column} IS ${where.not ? "NOT " : ""}NULL`,
					);
					break;
				case "In":
					if (!where.values.length) {
						segments.push(`${bool}1 = 0`);
						break;
					}
					segments.push(
						`${bool}${where.column} ${
							where.not ? "NOT " : ""
						}IN (${where.values.map(() => "?").join(", ")})`,
					);
					bindings.push(...where.values);
					break;
				case "Nested": {
					const nested = where.query.compileWheres();
					if (nested.clause) {
						segments.push(`${bool}(${nested.clause})`);
						bindings.push(...nested.bindings);
					}
					break;
				}
				case "Raw":
					segments.push(`${bool}${where.sql}`);
					bindings.push(...where.bindings);
					break;
			}
		}

		return {
			clause: segments.join(" ").trim(),
			bindings,
		};
	}

	private compileInsert(values: Attributes<M>): CompiledQuery {
		const columns = Object.keys(values);
		const placeholders = columns.map(() => "?").join(", ");
		const sql = `insert into ${this.model.getTable()} (${columns.join(", ")}) values (${placeholders})`;
		const bindings = columns.map(
			(column) => (values as Record<string, unknown>)[column],
		);
		return { sql, bindings };
	}

	private compileUpdate(values: Partial<Attributes<M>>): CompiledQuery {
		const columns = Object.keys(values);
		const assignments = columns.map((column) => `${column} = ?`).join(", ");
		let sql = `update ${this.model.getTable()} set ${assignments}`;
		const bindings = columns.map(
			(column) => (values as Record<string, unknown>)[column],
		);

		if (this.wheres.length) {
			const { clause, bindings: whereBindings } = this.compileWheres();
			sql += ` where ${clause}`;
			bindings.push(...whereBindings);
		}

		return { sql, bindings };
	}

	private compileDelete(): CompiledQuery {
		let sql = `delete from ${this.model.getTable()}`;
		const bindings: unknown[] = [];

		if (this.wheres.length) {
			const { clause, bindings: whereBindings } = this.compileWheres();
			sql += ` where ${clause}`;
			bindings.push(...whereBindings);
		}

		return { sql, bindings };
	}

	private async runSelect(): Promise<Attributes<M>[]> {
		const { sql, bindings } = this.compileSelect();
		return this.runQuery(sql, bindings);
	}

	private async runSelectRaw() {
		const { sql, bindings } = this.compileSelect();
		return this.runQuery(sql, bindings);
	}

	private async runStatement(sql: string, bindings: unknown[]): Promise<any> {
		return this.runQuery(sql, bindings);
	}

	private async runQuery<T = any>(
		sql: string,
		bindings: unknown[],
	): Promise<T> {
		const template = buildSqlTemplate(sql, bindings.length);
		const connection = this.manager.connectionFor(
			this.model,
			this.connectionOverride,
		);
		return connection(template, ...bindings);
	}

	private resolveAffectedRows(result: any): number {
		if (typeof result?.affectedRows === "number") {
			return result.affectedRows;
		}
		if (typeof result?.count === "number") {
			return result.count;
		}
		return 0;
	}

	private forNested(): MasonQueryBuilder<M> {
		const nested = new MasonQueryBuilder<M>(
			this.model,
			this.manager,
			this.connectionOverride,
		);
		return nested;
	}

	private clone(): MasonQueryBuilder<M> {
		const clone = new MasonQueryBuilder<M>(
			this.model,
			this.manager,
			this.connectionOverride,
		);

		clone.columns = [...this.columns];
		clone.wheres = this.wheres.map((where) => {
			if (where.type === "Nested") {
				return {
					...where,
					query: where.query.clone(),
				};
			}

			if (where.type === "In") {
				return { ...where, values: [...where.values] };
			}

			if (where.type === "Raw") {
				return { ...where, bindings: [...where.bindings] };
			}

			return { ...where };
		});
		clone.orders = [...this.orders];
		clone.limitValue = this.limitValue;
		clone.offsetValue = this.offsetValue;
		clone.aggregate = this.aggregate ? { ...this.aggregate } : undefined;
		clone.eagerLoads = new Map(
			Array.from(this.eagerLoads.entries(), ([key, constraints]) => [
				key,
				[...constraints],
			]),
		);

		return clone;
	}
}
