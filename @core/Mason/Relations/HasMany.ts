// @ts-nocheck
import type { Model } from "@core/Mason/Model";
import { HasOneOrMany } from "@core/Mason/Relations/HasOneOrMany";

export class HasManyRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends HasOneOrMany<Parent, Related, InstanceType<Related>[]> {
	async getResults(): Promise<InstanceType<Related>[]> {
		const query = this.newRelatedQuery();
		this.addConstraintsForModel(query, this.parent);
		return query.get();
	}

	initRelation(models: Parent[], relation: string): void {
		for (const model of models) {
			model.setRelation(relation, []);
		}
	}

	match(
		models: Parent[],
		results: InstanceType<Related>[],
		relation: string,
	): void {
		this.matchMany(models, results, relation);
	}
}
