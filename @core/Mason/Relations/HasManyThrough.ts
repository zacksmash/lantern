// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import { HasThroughRelation } from "@core/Mason/Relations/HasThrough";

export class HasManyThroughRelation<
	Parent extends Model,
	Related extends typeof Model,
	Through extends typeof Model,
> extends HasThroughRelation<
	Parent,
	Related,
	Through,
	InstanceType<Related>[]
> {
	async getResults(): Promise<InstanceType<Related>[]> {
		const results = await this.fetchRelated([this.parent]);
		const dictionary = this.buildRelatedDictionary(results);
		return this.gatherRelatedForModel(this.parent, dictionary);
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
		const dictionary = this.buildRelatedDictionary(results);

		for (const model of models) {
			const related = this.gatherRelatedForModel(model, dictionary);
			model.setRelation(relation, related);
		}
	}
}
