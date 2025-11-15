// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import { HasThroughRelation } from "@core/Mason/Relations/HasThrough";

export class HasOneThroughRelation<
	Parent extends Model,
	Related extends typeof Model,
	Through extends typeof Model,
> extends HasThroughRelation<
	Parent,
	Related,
	Through,
	InstanceType<Related> | null
> {
	async getResults(): Promise<InstanceType<Related> | null> {
		const results = await this.fetchRelated([this.parent]);
		const dictionary = this.buildRelatedDictionary(results);
		const related = this.gatherRelatedForModel(this.parent, dictionary);
		return related[0] ?? null;
	}

	initRelation(models: Parent[], relation: string): void {
		for (const model of models) {
			model.setRelation(relation, null);
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
			model.setRelation(relation, related[0] ?? null);
		}
	}
}
