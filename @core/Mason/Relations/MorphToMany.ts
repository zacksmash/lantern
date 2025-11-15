// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import { BelongsToManyRelation } from "@core/Mason/Relations/BelongsToMany";
import { buildSqlTemplate } from "@core/Mason/Sql";

export class MorphToManyRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends BelongsToManyRelation<Parent, Related> {
	constructor(
		parent: Parent,
		related: Related,
		pivotTable: string,
		foreignPivotKey: string,
		relatedPivotKey: string,
		parentKey: string,
		relatedKey: string,
		private readonly morphTypeColumn: string,
		private readonly morphClass: string,
	) {
		super(
			parent,
			related,
			pivotTable,
			foreignPivotKey,
			relatedPivotKey,
			parentKey,
			relatedKey,
		);
	}

	protected override async runPivotQuery(keys: unknown[]) {
		if (!keys.length) return [];

		const placeholders = keys.map(() => "?").join(", ");
		const sql = `select * from ${this.pivotTable} where ${this.foreignPivotKey} in (${placeholders}) and ${this.morphTypeColumn} = ?`;
		const template = buildSqlTemplate(sql, keys.length + 1);
		return this.getConnection()(template, ...keys, this.morphClass);
	}
}
