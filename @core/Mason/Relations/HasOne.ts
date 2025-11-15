// @ts-nocheck
import type { Model } from "@core/Mason/Model";
import { HasOneOrMany } from "@core/Mason/Relations/HasOneOrMany";

export class HasOneRelation<
	Parent extends Model,
	Related extends typeof Model,
> extends HasOneOrMany<Parent, Related, InstanceType<Related> | null> {
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
		const dictionary = new Map<unknown, InstanceType<Related>>();

		for (const related of results) {
			const key = related.getAttribute(
				this.foreignKey as keyof InstanceType<Related>["$attributes"],
			);
			if (!dictionary.has(key)) {
				dictionary.set(key, related);
			}
		}

		for (const model of models) {
			const key = model.getAttribute(
				this.localKey as keyof Parent["$attributes"],
			);
			model.setRelation(relation, dictionary.get(key) ?? null);
		}
	}
}
