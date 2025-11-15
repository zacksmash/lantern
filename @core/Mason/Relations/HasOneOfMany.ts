// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { HasOneRelation } from "@core/Mason/Relations/HasOne";

type OrderDirection = "asc" | "desc";

export type HasOneOfManyOptions<Related extends typeof Model> = {
	orderColumn?: keyof InstanceType<Related>["$attributes"] & string;
	orderDirection?: OrderDirection;
	constraint?: (query: MasonQueryBuilder<Related>) => void;
};

export class HasOneOfManyRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends HasOneRelation<Parent, Related> {
	private readonly orderColumn: string;
	private readonly orderDirection: OrderDirection;
	private readonly constraint?: (query: MasonQueryBuilder<Related>) => void;

	constructor(
		parent: Parent,
		related: Related,
		foreignKey: string,
		localKey: string,
		options: HasOneOfManyOptions<Related> = {},
	) {
		super(parent, related, foreignKey, localKey);
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
		if (this.constraint) {
			this.constraint(query);
		}
	}

	override match(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	): void {
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
			const matches = dictionary.get(key);
			if (!matches || matches.length === 0) {
				model.setRelation(relation, null);
				continue;
			}

			const best = this.pickBest(matches);
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
