// @ts-nocheck
import type { Model } from "@core/Mason/Model";
import { MorphOneOrMany } from "@core/Mason/Relations/MorphOneOrMany";

export class MorphOneRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends MorphOneOrMany<Parent, Related, InstanceType<Related> | null> {
	async getResults(): Promise<InstanceType<Related> | null> {
		const query = this.newRelatedQuery();
		this.addConstraintsForModel(query, this.parent);
		return query.first();
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
		const dictionary = this.buildDictionary(results);

		for (const model of models) {
			const key = model.getAttribute(
				this.localKey as keyof Parent["$attributes"],
			);
			const related = dictionary.get(key);
			model.setRelation(relation, related?.[0] ?? null);
		}
	}
}
