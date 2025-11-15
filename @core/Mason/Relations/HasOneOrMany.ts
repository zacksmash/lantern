// @ts-nocheck
import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";

export abstract class HasOneOrMany<
	Parent extends Model,
	Related extends typeof Model,
	Result,
> extends Relation<Parent, Related, Result> {
	constructor(
		parent: Parent,
		related: Related,
		protected readonly foreignKey: string,
		protected readonly localKey: string,
	) {
		super(parent, related);
	}

	protected addConstraintsForModel(
		query: MasonQueryBuilder<Related>,
		model: Parent,
	) {
		query.where(
			this.foreignKey as keyof InstanceType<Related>["$attributes"],
			model.getAttribute(this.localKey as keyof Parent["$attributes"]),
		);
	}

	addEagerConstraints(
		query: MasonQueryBuilder<Related>,
		models: Parent[],
	): void {
		const keys = models
			.map((model) =>
				model.getAttribute(this.localKey as keyof Parent["$attributes"]),
			)
			.filter((value) => value !== undefined && value !== null);

		if (!keys.length) {
			// Force an empty result set when no keys are available
			query.whereRaw("1 = 0");
			return;
		}

		query.whereIn(
			this.foreignKey as keyof InstanceType<Related>["$attributes"],
			keys,
		);
	}

	protected matchMany(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	) {
		const dictionary = new Map<unknown, InstanceType<Related>[]>();

		for (const related of results) {
			const key = related.getAttribute(
				this.foreignKey as keyof InstanceType<Related>["$attributes"],
			);

			if (!dictionary.has(key)) {
				dictionary.set(key, []);
			}

			dictionary.get(key)!.push(related);
		}

		for (const model of models) {
			const key = model.getAttribute(
				this.localKey as keyof Parent["$attributes"],
			);
			model.setRelation(relation, dictionary.get(key) ?? []);
		}
	}
}
