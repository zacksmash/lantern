// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";
import { buildSqlTemplate } from "@core/Mason/Sql";
import type { SQL } from "bun";

type PivotRow = Record<string, unknown>;

export class BelongsToManyRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends Relation<Parent, Related, InstanceType<Related>[]> {
	protected pivotColumns: string[] = [];

	constructor(
		parent: Parent,
		related: Related,
		protected readonly pivotTable: string,
		protected readonly foreignPivotKey: string,
		protected readonly relatedPivotKey: string,
		protected readonly parentKey: string,
		protected readonly relatedKey: string,
	) {
		super(parent, related);
	}

	withPivot(...columns: string[]): this {
		this.pivotColumns = [...new Set([...this.pivotColumns, ...columns])];
		return this;
	}

	async getResults(): Promise<InstanceType<Related>[]> {
		const { relatedModels, pivotDictionary } = await this.gather([this.parent]);

		const parentKey = this.parent.getAttribute(
			this.parentKey as keyof Parent["$attributes"],
		);

		if (parentKey === undefined || parentKey === null) {
			return [];
		}

		return this.buildRelatedForParent(
			parentKey,
			pivotDictionary,
			relatedModels,
		);
	}

	initRelation(models: Parent[], relation: string): void {
		for (const model of models) {
			model.setRelation(relation, []);
		}
	}

	override async eagerLoad(
		models: Parent[],
		relation: string,
		constraint?: (query: MasonQueryBuilder<Related>) => void,
	): Promise<void> {
		if (!models.length) return;

		this.initRelation(models, relation);
		const { relatedModels, pivotDictionary } = await this.gather(
			models,
			constraint,
		);

		for (const model of models) {
			const parentKey = model.getAttribute(
				this.parentKey as keyof Parent["$attributes"],
			);
			if (parentKey === undefined || parentKey === null) {
				continue;
			}

			const related = this.buildRelatedForParent(
				parentKey,
				pivotDictionary,
				relatedModels,
			);
			model.setRelation(relation, related);
		}
	}

	protected async gather(
		models: Parent[],
		constraint?: (query: MasonQueryBuilder<Related>) => void,
	) {
		const pivotDictionary = await this.getPivotDictionary(models);
		const relatedIds = new Set<unknown>();

		for (const pivotRows of pivotDictionary.values()) {
			for (const row of pivotRows) {
				const id = row[this.relatedPivotKey];
				if (id !== undefined && id !== null) {
					relatedIds.add(id);
				}
			}
		}

		let relatedModels: InstanceType<Related>[] = [];

		if (relatedIds.size > 0) {
			const query = this.newRelatedQuery();
			query.whereIn(
				this.relatedKey as keyof InstanceType<Related>["$attributes"],
				Array.from(relatedIds),
			);
			constraint?.(query);
			relatedModels = await query.get();
		}

		return { relatedModels, pivotDictionary };
	}

	protected async getPivotDictionary(models: Parent[]) {
		const dictionary = new Map<unknown, PivotRow[]>();
		const parentKeys = models
			.map((model) =>
				model.getAttribute(this.parentKey as keyof Parent["$attributes"]),
			)
			.filter((value) => value !== undefined && value !== null);

		if (!parentKeys.length) {
			return dictionary;
		}

		const rows = await this.runPivotQuery(parentKeys);

		for (const row of rows) {
			const key = row[this.foreignPivotKey];

			if (key === undefined || key === null) {
				continue;
			}

			if (!dictionary.has(key)) {
				dictionary.set(key, []);
			}

			dictionary.get(key)!.push(row);
		}

		return dictionary;
	}

	protected async runPivotQuery(keys: unknown[]): Promise<PivotRow[]> {
		const placeholders = keys.map(() => "?").join(", ");
		const sql = `select * from ${this.pivotTable} where ${this.foreignPivotKey} in (${placeholders})`;
		const template = buildSqlTemplate(sql, keys.length);
		return this.getConnection()<PivotRow[]>(template, ...keys);
	}

	protected getConnection(): SQL {
		return this.parent.getConnection();
	}

	protected buildRelatedForParent(
		parentKey: unknown,
		pivotDictionary: Map<unknown, PivotRow[]>,
		relatedModels: InstanceType<Related>[],
	): InstanceType<Related>[] {
		const pivots = pivotDictionary.get(parentKey) ?? [];
		if (!pivots.length) {
			return [];
		}

		const relatedDictionary = new Map<unknown, InstanceType<Related>>();

		for (const model of relatedModels) {
			const key = model.getAttribute(
				this.relatedKey as keyof InstanceType<Related>["$attributes"],
			);
			if (key !== undefined && key !== null) {
				relatedDictionary.set(key, model);
			}
		}

		const related: InstanceType<Related>[] = [];

		for (const pivot of pivots) {
			const relatedId = pivot[this.relatedPivotKey];
			if (relatedId === undefined || relatedId === null) {
				continue;
			}

			const model = relatedDictionary.get(relatedId);
			if (!model) continue;

			const clone = model.replicate();
			const pivotData = this.extractPivotColumns(pivot);
			clone.setRelation("pivot" as never, pivotData);
			related.push(clone);
		}

		return related;
	}

	protected extractPivotColumns(row: PivotRow): PivotRow {
		if (!this.pivotColumns.length) {
			return row;
		}

		const data: PivotRow = {};

		for (const column of this.pivotColumns) {
			if (column in row) {
				data[column] = row[column];
			}
		}

		return data;
	}
}
