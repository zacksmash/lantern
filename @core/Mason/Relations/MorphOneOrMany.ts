// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";

export abstract class MorphOneOrMany<
	Parent extends Model,
	Related extends typeof Model,
	Result,
> extends Relation<Parent, Related, Result> {
	protected readonly morphClass: string;

	constructor(
		parent: Parent,
		related: Related,
		protected readonly morphTypeColumn: string,
		protected readonly morphIdColumn: string,
		protected readonly localKey: string,
	) {
		super(parent, related);
		this.morphClass = (parent.constructor as typeof Model).getMorphType();
	}

	protected addConstraintsForModel(
		query: MasonQueryBuilder<Related>,
		model: Parent,
	) {
		const key = model.getAttribute(
			this.localKey as keyof Parent["$attributes"],
		);
		if (key === undefined || key === null) {
			query.whereRaw("1 = 0");
			return;
		}

		query.where(
			this.morphTypeColumn as keyof InstanceType<Related>["$attributes"],
			this.morphClass,
		);

		query.where(
			this.morphIdColumn as keyof InstanceType<Related>["$attributes"],
			key,
		);
	}

	addEagerConstraints(query: MasonQueryBuilder<Related>, models: Parent[]) {
		const keys = models
			.map((model) =>
				model.getAttribute(this.localKey as keyof Parent["$attributes"]),
			)
			.filter((value) => value !== undefined && value !== null);

		if (!keys.length) {
			query.whereRaw("1 = 0");
			return;
		}

		query.where(
			this.morphTypeColumn as keyof InstanceType<Related>["$attributes"],
			this.morphClass,
		);

		query.whereIn(
			this.morphIdColumn as keyof InstanceType<Related>["$attributes"],
			keys,
		);
	}

	protected buildDictionary(
		results: InstanceType<Related>[],
	): Map<unknown, InstanceType<Related>[]> {
		const dictionary = new Map<unknown, InstanceType<Related>[]>();

		for (const related of results) {
			const key = related.getAttribute(
				this.morphIdColumn as keyof InstanceType<Related>["$attributes"],
			);

			if (!dictionary.has(key)) {
				dictionary.set(key, []);
			}

			dictionary.get(key)!.push(related);
		}

		return dictionary;
	}
}
