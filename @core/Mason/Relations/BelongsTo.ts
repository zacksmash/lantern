// @ts-nocheck
import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";

export class BelongsToRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends Relation<Parent, Related, InstanceType<Related> | null> {
	constructor(
		parent: Parent,
		related: Related,
		private readonly foreignKey: string,
		private readonly ownerKey: string,
	) {
		super(parent, related);
	}

	async getResults(): Promise<InstanceType<Related> | null> {
		const value = this.parent.getAttribute(
			this.foreignKey as keyof Parent["$attributes"],
		);

		if (value === undefined || value === null) {
			return null;
		}

		return this.newRelatedQuery()
			.where(
				this.ownerKey as keyof InstanceType<Related>["$attributes"] & string,
				value,
			)
			.first();
	}

	initRelation(models: Parent[], relation: string): void {
		for (const model of models) {
			model.setRelation(relation, null);
		}
	}

	addEagerConstraints(
		query: MasonQueryBuilder<Related>,
		models: Parent[],
	): void {
		const keys = models
			.map((model) =>
				model.getAttribute(this.foreignKey as keyof Parent["$attributes"]),
			)
			.filter((value) => value !== undefined && value !== null);

		if (!keys.length) {
			query.whereRaw("1 = 0");
			return;
		}

		query.whereIn(
			this.ownerKey as keyof InstanceType<Related>["$attributes"] & string,
			keys,
		);
	}

	match(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	): void {
		const dictionary = new Map<unknown, InstanceType<Related>>();

		for (const related of results) {
			const key = related.getAttribute(
				this.ownerKey as keyof InstanceType<Related>["$attributes"],
			);
			dictionary.set(key, related);
		}

		for (const model of models) {
			const key = model.getAttribute(
				this.foreignKey as keyof Parent["$attributes"],
			);
			model.setRelation(relation, dictionary.get(key) ?? null);
		}
	}
}
