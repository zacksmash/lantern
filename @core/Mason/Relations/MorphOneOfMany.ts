// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { MorphOneRelation } from "@core/Mason/Relations/MorphOne";

type OrderDirection = "asc" | "desc";

export type MorphOneOfManyOptions<Related extends typeof Model> = {
	orderColumn?: keyof InstanceType<Related>["$attributes"] & string;
	orderDirection?: OrderDirection;
	constraint?: (query: MasonQueryBuilder<Related>) => void;
};

export class MorphOneOfManyRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends MorphOneRelation<Parent, Related> {
	private readonly orderColumn: string;
	private readonly orderDirection: OrderDirection;
	private readonly constraint?: (query: MasonQueryBuilder<Related>) => void;

	constructor(
		parent: Parent,
		related: Related,
		morphTypeColumn: string,
		morphIdColumn: string,
		localKey: string,
		options: MorphOneOfManyOptions<Related> = {},
	) {
		super(parent, related, morphTypeColumn, morphIdColumn, localKey);
		const defaultColumn =
			options.orderColumn ??
			(related.timestamps && related.updatedAtColumn
				? (related.updatedAtColumn as keyof InstanceType<Related>["$attributes"] &
						string)
				: (related.primaryKey as keyof InstanceType<Related>["$attributes"] &
						string));
		this.orderColumn = defaultColumn;
		this.orderDirection = options.orderDirection ?? "desc";
		this.constraint = options.constraint;
	}

	override async getResults(): Promise<InstanceType<Related> | null> {
		const query = this.newRelatedQuery();
		this.addConstraintsForModel(query, this.parent);
		this.applySingleModelConstraints(query);
		return query.first();
	}

	override addEagerConstraints(
		query: MasonQueryBuilder<Related>,
		models: Parent[],
	): void {
		super.addEagerConstraints(query, models);
		this.constraint?.(query);
	}

	override match(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	): void {
		const dictionary = this.buildDictionary(results);

		for (const model of models) {
			const key = model.getAttribute(
				this.localKey as keyof Parent["$attributes"],
			);
			const related = dictionary.get(key);

			if (!related || !related.length) {
				model.setRelation(relation, null);
				continue;
			}

			const best = this.pickBest(related);
			model.setRelation(relation, best ?? null);
		}
	}

	private applySingleModelConstraints(query: MasonQueryBuilder<Related>) {
		query.orderBy(
			this.orderColumn as keyof InstanceType<Related>["$attributes"] & string,
			this.orderDirection,
		);
		query.limit(1);
		this.constraint?.(query);
	}

	private pickBest(
		results: InstanceType<Related>[],
	): InstanceType<Related> | null {
		if (!results.length) return null;

		const sorted = [...results].sort((a, b) => {
			const aValue = a.getAttribute(
				this.orderColumn as keyof InstanceType<Related>["$attributes"],
			);
			const bValue = b.getAttribute(
				this.orderColumn as keyof InstanceType<Related>["$attributes"],
			);

			if (aValue === bValue) return 0;
			if (aValue === undefined || aValue === null) return 1;
			if (bValue === undefined || bValue === null) return -1;

			const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
			return this.orderDirection === "asc" ? comparison : -comparison;
		});

		return sorted[0] ?? null;
	}
}
