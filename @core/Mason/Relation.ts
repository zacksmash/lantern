import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";

export type RelationResultType<T> = T extends Relation<any, any, infer Result>
	? Result
	: never;

export type RelatedModelType<T> = T extends Relation<any, infer Related, any>
	? Related
	: never;

export abstract class Relation<
	Parent extends Model,
	Related extends typeof Model,
	Result,
> {
	protected constructor(
		protected readonly parent: Parent,
		protected readonly related: Related,
	) {}

	protected newRelatedQuery(): MasonQueryBuilder<Related> {
		return this.related.newQuery();
	}

	getRelated(): Related {
		return this.related;
	}

	abstract getResults(): Promise<Result>;

	abstract initRelation(models: Parent[], relation: string): void;

	abstract match(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	): void;

	abstract addEagerConstraints(
		query: MasonQueryBuilder<Related>,
		models: Parent[],
	): void;

	async eagerLoad(
		models: Parent[],
		relation: string,
		constraint?: (query: MasonQueryBuilder<Related>) => void,
	): Promise<void> {
		if (!models.length) return;

		this.initRelation(models, relation);
		const query = this.newRelatedQuery();
		this.addEagerConstraints(query, models);

		if (constraint) {
			constraint(query);
		}

		const results = await query.get();
		this.match(models, results, relation);
	}
}
